import { getPaymentSettings } from './adminService';
// Correctly import User from types.ts
import { User, TransparentPaymentFormData } from '../types';
import { UserPlan } from '../types/plan.types';
import { supabase } from './supabaseClient';
import { PLANS } from '../constants';

/**
 * Simula a criação de uma preferência de pagamento no Mercado Pago.
 * Esta função agora é um fallback ou para outros métodos, o checkout transparente
 * usará `processMercadoPagoPayment`.
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

/**
 * Simula o processamento de um pagamento transparente do Mercado Pago.
 * Em um cenário real, esta função seria um endpoint de backend.
 * Para este frontend-only app, ela simula a lógica de backend.
 */
export const processMercadoPagoPayment = async (
    paymentData: TransparentPaymentFormData,
    user: User,
    publicMercadoPagoKey: string
): Promise<{ success: boolean; message: string }> => {
    console.log("[SIMULATION] Processando pagamento Mercado Pago Transparente...");
    console.log("Dados recebidos (simulados como backend):", paymentData);
    console.log("Usuário:", user.email);
    console.log("Chave Pública Mercado Pago:", publicMercadoPagoKey);

    try {
        // --- SIMULAÇÃO DE CHAMADA AO BACKEND E API MERCADO PAGO ---
        // Aqui, um backend real faria a chamada para a API do Mercado Pago
        // utilizando o token do cartão e a secret_key.
        // Como estamos no frontend, vamos simular um sucesso após um pequeno delay.
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simula delay da rede

        // Validar dados básicos (ex: token deve existir)
        if (!paymentData.token || !paymentData.amount || paymentData.amount <= 0) {
            return { success: false, message: "Dados de pagamento incompletos ou inválidos." };
        }

        // --- SIMULAÇÃO DE ATUALIZAÇÃO DO BANCO DE DADOS (Frontend) ---
        // Em um backend, isso seria feito após a confirmação da API do Mercado Pago.
        // Aqui, faremos diretamente no Supabase como se a confirmação tivesse chegado.

        const newCreditsAmount = paymentData.metadata.creditsAmount;
        const currentCredits = user.credits;
        const updatedCredits = currentCredits === -1 ? -1 : (currentCredits + newCreditsAmount); // Admins remain -1

        // 1. Atualizar créditos do usuário
        const { error: creditsError } = await supabase
            .from('user_credits')
            .upsert({ user_id: user.id, credits: updatedCredits });

        if (creditsError) {
            console.error('Erro ao atualizar créditos do usuário:', creditsError);
            return { success: false, message: `Falha ao atualizar créditos: ${creditsError.message}` };
        }

        // 2. Registrar a transação como APROVADA
        const { error: transactionError } = await supabase.from('transactions').insert({
            usuario_id: user.id,
            valor: paymentData.amount,
            metodo: 'card', // Assumimos que o checkout transparente é sempre por cartão
            status: 'approved',
            external_id: `MOCK_MP_TXN_${Date.now()}`, // ID externo simulado
            metadata: {
                ...paymentData.metadata,
                token: paymentData.token.substring(0, 10) + "...", // Não salvar token completo no metadata
                installments: paymentData.installments,
                public_key_used: publicMercadoPagoKey,
                // Adicione qualquer outra informação relevante do paymentData
            }
        });

        if (transactionError) {
            console.error('Erro ao registrar transação aprovada:', transactionError);
            // Reverter créditos se a transação falhar o registro (idealmente um sistema mais robusto)
            return { success: false, message: `Pagamento aprovado, mas falha ao registrar transação: ${transactionError.message}` };
        }

        // 3. Logar a ação
        await supabase.from('logs').insert([{
            usuario_id: user.id,
            acao: 'mercado_pago_transparent_payment_approved',
            modulo: 'Pagamentos',
            detalhes: { 
                amount: paymentData.amount, 
                credits_added: newCreditsAmount, 
                credits_after: updatedCredits,
                item_type: paymentData.metadata.item_type,
            }
        }]);

        return { success: true, message: "Pagamento aprovado e créditos adicionados com sucesso!" };

    } catch (error: any) {
        console.error("Erro crítico na simulação de pagamento transparente:", error);
        return { success: false, message: error.message || "Ocorreu um erro inesperado ao processar o pagamento." };
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

    // Para assinatura de plano, ainda pode-se preferir o redirect (futuramente uma função backend real)
    return createMercadoPagoPreference({
        title: `Upgrade GDN_IA - Plano ${plan.name}`,
        price: plan.price,
        quantity: 1,
        type: 'plan'
    }, user, { planId });
};

// Esta função agora prepara os dados para o checkout transparente,
// mas não inicia o processo de pagamento diretamente.
export const getMercadoPagoCheckoutData = async (amount: number, price: number, user: User) => {
    const settings = await getPaymentSettings();
    const mpConfig = settings.gateways.mercadoPago;

    if (!mpConfig.enabled || !mpConfig.publicKey) {
        throw new Error("Mercado Pago não está configurado. Por favor, contate o suporte ou configure-o no painel de administração.");
    }

    return {
        publicKey: mpConfig.publicKey,
        amount: price,
        description: `Pacote de ${amount} Créditos GDN_IA`,
        payerEmail: user.email,
        metadata: {
            item_type: 'credits',
            creditsAmount: amount,
        }
    };
};
