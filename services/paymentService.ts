

import { getPaymentSettings } from './adminService';
// Correctly import User from types.ts
import { User } from '../types';
import { UserPlan } from '../types/plan.types';
import { supabase } from './supabaseClient';
import { PLANS } from '../constants';

/**
 * Simula a criação de uma preferência de pagamento no Mercado Pago.
 */
export const createMercadoPagoPreference = async (
    item: { title: string; price: number; quantity: number; type: 'plan' | 'credits' },
    user: User,
    metadata?: any
): Promise<string> => {
    try {
        const settings = await getPaymentSettings();
        const mpConfig = settings.gateways.mercadoPago;

        if (!mpConfig.enabled || !mpConfig.publicKey) {
            // Fallback para dev/teste se não estiver configurado, para não travar a UI
            console.warn("Mercado Pago não configurado. Usando modo de simulação fallback.");
        }

        console.log(`[MOCK] Criando preferência MP para: ${item.title} - R$ ${item.price}`);
        
        // Em produção, isso chamaria: supabase.functions.invoke('create-mp-preference', ...)
        // Simulamos o registro da transação pendente no banco
        const { error } = await supabase.from('transactions').insert({
            usuario_id: user.id,
            valor: item.price,
            metodo: 'pix', // Default mock method
            status: 'pending',
            metadata: {
                item_type: item.type,
                plan_id: metadata?.planId,
                credits_amount: metadata?.creditsAmount,
                provider: 'mercado_pago',
                description: item.title,
                ...metadata // Inclui metadados passados, como o ID do plano ou quantidade de créditos
            }
        });

        if (error) {
            console.error("Erro ao registrar intenção de transação:", error);
            throw new Error("Erro ao registrar transação no banco de dados.");
        }

        // Retorna Link Simulado do Mercado Pago
        // URL real seria: https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...
        return `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=MOCK-MP-${Date.now()}&user=${user.id}`;
    } catch (error: any) {
        console.error("Erro no pagamento:", error);
        throw new Error(error.message || "Falha ao iniciar pagamento.");
    }
};

export const handlePlanSubscription = async (planId: UserPlan, user: User): Promise<string> => {
    const plan = PLANS[planId];
    if (plan.price <= 0) {
        // Para o plano gratuito, não há "assinatura" no sentido de pagamento.
        // O usuário já "tem" o plano free ou pode estar tentando um downgrade.
        // A lógica de downgrade deve ser tratada separadamente, geralmente pelo admin ou suporte.
        throw new Error("Este plano não requer pagamento. Se deseja gerenciar seu plano, consulte as opções disponíveis.");
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