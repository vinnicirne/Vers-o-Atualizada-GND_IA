
import { getPaymentSettings, processAffiliateCommission } from './adminService';
import { User } from '../types';
import { UserPlan } from '../types/plan.types';
import { api } from './api';
import { PLANS } from '../constants';

export const createMercadoPagoPreference = async (
    item: { title: string; price: number; quantity: number; type: 'plan' | 'credits' },
    user: User,
    metadata?: any
): Promise<string> => {
    try {
        const settings = await getPaymentSettings();
        const mpConfig = settings.gateways.mercadoPago;

        if (!mpConfig.enabled || !mpConfig.publicKey) {
            console.warn("Mercado Pago não configurado. Usando modo de simulação fallback.");
        }

        console.log(`[MOCK] Criando preferência MP para: ${item.title} - R$ ${item.price}`);
        
        // Simulação de Pagamento Aprovado Instantaneamente (para testar afiliados)
        // Em produção, isso seria via Webhook
        
        // 1. Registra a transação
        const { error } = await api.insert('transactions', {
            usuario_id: user.id,
            valor: item.price,
            metodo: 'pix', 
            status: 'approved', // MOCK: Aprovado direto para gerar comissão
            metadata: {
                item_type: item.type,
                plan_id: metadata?.planId,
                credits_amount: metadata?.creditsAmount,
                provider: 'mercado_pago',
                description: item.title,
                ...metadata 
            }
        });

        if (error) {
            console.error("Erro ao registrar intenção de transação:", error);
            throw new Error("Erro ao registrar transação no banco de dados.");
        }

        // 2. Processa a Comissão do Afiliado (Se houver)
        // Só paga comissão se a transação for aprovada
        // Chamamos a função de forma fire-and-forget para não travar o fluxo
        processAffiliateCommission(user.id, item.price, `Comissão ref. ${item.title}`).catch(e => 
            console.error("Erro ao processar comissão:", e)
        );

        return `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=MOCK-MP-${Date.now()}&user=${user.id}`;
    } catch (error: any) {
        console.error("Erro no pagamento:", error);
        throw new Error(error.message || "Falha ao iniciar pagamento.");
    }
};

export const handlePlanSubscription = async (planId: UserPlan, user: User): Promise<string> => {
    const plan = PLANS[planId];
    if (plan.price <= 0) {
        throw new Error("Este plano não requer pagamento.");
    }

    return createMercadoPagoPreference({
        title: `Upgrade GDN_IA - Plano ${plan.name}`,
        price: plan.price,
        quantity: 1,
        type: 'plan'
    }, user, { planId });
};

export const handleCreditPurchase = async (amount: number, price: number, user: User): Promise<string> => {
    return createMercadoPagoPreference({
        title: `Pacote de ${amount} Créditos GDN_IA`,
        price: price,
        quantity: 1,
        type: 'credits'
    }, user, { creditsAmount: amount });
};
