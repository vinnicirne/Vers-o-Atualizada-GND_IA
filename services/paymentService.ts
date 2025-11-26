import { getPaymentSettings } from './adminService';
// Correctly import User from types.ts
import { User } from '../types';
import { UserPlan } from '../types/plan.types';
import { supabase } from './supabaseClient';
import { PLANS } from '../constants';

/**
 * Simula a criação de uma preferência de pagamento no Mercado Pago.
 * Em uma implementação real, esta seria uma Edge Function ou um endpoint de backend.
 */
export const initMercadoPagoPayment = async (
    item: { title: string; price: number; quantity: number; type: 'plan' | 'credits' },
    user: User,
    metadata?: any
): Promise<{ preferenceId: string; publicKey: string }> => {
    try {
        const settings = await getPaymentSettings();
        const mpConfig = settings.gateways.mercadoPago;

        if (!mpConfig.enabled) {
            throw new Error("Mercado Pago não está habilitado nas configurações.");
        }
        if (!mpConfig.publicKey || !mpConfig.secretKey) {
            throw new Error("Chaves de Mercado Pago (Public Key ou Secret Key) não configuradas. Verifique as configurações de pagamento no painel administrativo.");
        }

        console.log(`[MOCK - BACKEND] Chamada para criar preferência MP para: ${item.title} - R$ ${item.price}`);
        
        // Em um cenário real, aqui você chamaria a API do Mercado Pago (via SDK de backend)
        // para criar a preferência. A secretKey seria usada aqui, não exposta no frontend.
        // O response incluiria o ID da preferência.
        const mockPreferenceId = `pref-MOCK-MP-${Date.now()}`;

        // Simulamos o registro da transação pendente no banco
        const { error: txError } = await supabase.from('transactions').insert({
            usuario_id: user.id,
            valor: item.price,
            metodo: 'card', // Assume 'card' para checkout transparente
            status: 'pending',
            external_id: mockPreferenceId, // Armazena o ID da preferência mock
            metadata: {
                item_type: item.type,
                plan_id: metadata?.planId,
                credits_amount: metadata?.creditsAmount,
                provider: 'mercado_pago_transparent',
                description: item.title,
                ...metadata 
            }
        });

        if (txError) {
            console.error("Erro ao registrar intenção de transação:", txError);
            throw new Error("Erro ao registrar transação no banco de dados.");
        }

        return {
            preferenceId: mockPreferenceId,
            publicKey: mpConfig.publicKey
        };

    } catch (error: any) {
        console.error("Erro ao iniciar pagamento Mercado Pago:", error);
        throw new Error(error.message || "Falha ao iniciar pagamento Mercado Pago.");
    }
};

/**
 * Simula a finalização do pagamento no Mercado Pago com o token do cartão.
 * Em uma implementação real, esta seria OBRIGATORIAMENTE uma Edge Function ou um endpoint de backend.
 */
export const finalizeMercadoPagoPayment = async (
    paymentData: {
        paymentMethodId: string;
        token: string;
        issuerId: string;
        installments: number;
        amount: number;
        description: string;
        payerEmail: string;
        preferenceId: string; // Opcional, para linkar com a preferência criada
    },
    user: User
): Promise<{ success: boolean; transactionId?: string; message?: string }> => {
    try {
        const settings = await getPaymentSettings();
        const mpConfig = settings.gateways.mercadoPago;

        if (!mpConfig.enabled || !mpConfig.secretKey) {
            throw new Error("Mercado Pago não configurado corretamente para processar pagamentos.");
        }

        console.log("[MOCK - BACKEND] Chamada para finalizar pagamento MP com token:", paymentData);

        // Em um cenário real, aqui você usaria a secretKey (access_token) e o SDK de backend do MP
        // para criar o pagamento.
        // Ex: `mercadopago.payment.create(...)`
        
        // Simulação de sucesso/falha baseada em alguma lógica simples ou randômica
        const isSuccess = Math.random() > 0.1; // 90% de chance de sucesso
        const mockTransactionId = `tx-${Date.now()}`;

        if (isSuccess) {
            // Atualiza a transação para aprovada
            const { error: updateError } = await supabase.from('transactions')
                .update({ 
                    status: 'approved',
                    external_id: mockTransactionId, // Substitui o mockPreferenceId pelo ID real da transação
                    metadata: { ...paymentData, user_id: user.id } 
                })
                .eq('external_id', paymentData.preferenceId) // Encontra a transação pendente pela preferenceId
                .eq('usuario_id', user.id);

            if (updateError) {
                console.error("Erro ao atualizar status da transação para 'approved':", updateError);
                throw new Error("Pagamento aprovado, mas falha ao atualizar o status da transação no banco.");
            }
            // Aqui também você adicionaria a lógica para adicionar créditos ao usuário ou mudar o plano
            return { success: true, transactionId: mockTransactionId };
        } else {
            // Atualiza a transação para falha
            const { error: updateError } = await supabase.from('transactions')
                .update({ 
                    status: 'failed',
                    metadata: { ...paymentData, user_id: user.id, reason: "Simulated decline" } 
                })
                .eq('external_id', paymentData.preferenceId)
                .eq('usuario_id', user.id);

            if (updateError) {
                console.error("Erro ao atualizar status da transação para 'failed':", updateError);
            }
            throw new Error("Pagamento recusado. Tente outro cartão ou método.");
        }

    } catch (error: any) {
        console.error("Erro ao finalizar pagamento Mercado Pago:", error);
        return { success: false, message: error.message || "Falha ao finalizar pagamento." };
    }
};

export const handlePlanSubscription = async (planId: UserPlan, user: User): Promise<{ preferenceId: string; publicKey: string }> => {
    const plan = PLANS[planId];
    if (plan.price <= 0) {
        throw new Error("Este plano não requer pagamento.");
    }

    return initMercadoPagoPayment({
        title: `Upgrade GDN_IA - Plano ${plan.name}`,
        price: plan.price,
        quantity: 1,
        type: 'plan'
    }, user, { planId });
};

export const handleCreditPurchase = async (amount: number, price: number, user: User): Promise<{ preferenceId: string; publicKey: string }> => {
    return initMercadoPagoPayment({
        title: `Pacote de ${amount} Créditos GDN_IA`,
        price: price,
        quantity: 1,
        type: 'credits'
    }, user, { creditsAmount: amount });
};