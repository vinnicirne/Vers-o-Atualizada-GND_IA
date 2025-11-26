import { getPaymentSettings } from './adminService';
// Correctly import User from types.ts
import { User, TransparentPaymentFormData } from '../types';
import { UserPlan } from '../types/plan.types';
import { supabase } from './supabaseClient';
import { PLANS } from '../constants';

/**
 * Simula a criação de uma preferência de pagamento no Mercado Pago,
 * adaptado para fluxos de redirecionamento (planos ou créditos).
 */
export const createMercadoPagoPreference = async (
    item: { title: string; price: number; quantity: number; type: 'plan' | 'credits' },
    user: User,
    metadata?: any
): Promise<string> => {
    try {
        const settings = await getPaymentSettings();
        const mpConfig = settings.gateways.mercadoPago;

        if (!mpConfig.enabled) {
            throw new Error("Mercado Pago não configurado. Por favor, contate o suporte ou configure-o no painel de administração.");
        }
        
        // Em um cenário real, estas informações seriam enviadas para um backend.
        // O backend chamaria a API do Mercado Pago para criar a preferência de pagamento (para um-time)
        // ou um plano de pré-aprovação/assinatura (para recorrentes).
        // Aqui, simulamos o processo.

        // Simula o registro da transação como pendente no banco de dados.
        const { error } = await supabase.from('transactions').insert({
            usuario_id: user.id,
            valor: item.price,
            metodo: 'card', // O método será determinado pelo MP no fluxo de redirecionamento. 'card' é um placeholder válido para iniciar.
            status: 'pending',
            external_id: `MP_PREF_MOCK_${Date.now()}`, // ID da preferência MP simulado
            metadata: {
                item_type: item.type,
                plan_id: metadata?.planId,
                credits_amount: metadata?.creditsAmount,
                provider: 'mercado_pago_redirect_flow',
                description: item.title,
                ...metadata // Inclui metadados passados
            }
        });

        if (error) {
            console.error("Erro ao registrar intenção de transação:", error);
            throw new Error("Erro ao registrar transação no banco de dados.");
        }

        // Gerar uma URL de redirecionamento simulada do Mercado Pago.
        // Em um ambiente real, seria `response.init_point` da API do MP.
        const mockRedirectUrl = `https://mp-redirect-flow.example.com/checkout?amount=${item.price}&type=${item.type}&user_id=${user.id}&plan_id=${metadata?.planId || ''}&payment_status=approved`;

        return mockRedirectUrl;
    } catch (error: any) {
        console.error("Erro ao criar preferência de pagamento:", error);
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
): Promise<{ success: boolean; message: string }> => {
    console.log("[SIMULATION] Processando pagamento Mercado Pago Transparente...");
    console.log("Dados recebidos (simulados como backend):", paymentData);
    console.log("Usuário:", user.email);

    try {
        const settings = await getPaymentSettings();
        const mpConfig = settings.gateways.mercadoPago;
        if (!mpConfig.enabled || !mpConfig.publicKey) { // public key is just for a check, secret key would be used on backend
            return { success: false, message: "Mercado Pago não configurado. Por favor, contate o suporte." };
        }
        const publicMercadoPagoKey = mpConfig.publicKey;

        // --- SIMULAÇÃO DE CHAMADA AO BACKEND E API MERCADO PAGO ---
        // Aqui, um backend real faria a chamada para a API do Mercado Pago
        // utilizando o token do cartão e a secret_key.
        // Como estamos no frontend, vamos simular um sucesso após um pequeno delay.
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simula delay da rede

        // Validar dados básicos (ex: token deve existir)
        if (!paymentData.token || !paymentData.amount || paymentData.amount <= 0) {
            return { success: false, message: "Dados de pagamento incompletos ou inválidos." };
        }

        // Adiciona validação para payerEmail
        if (!paymentData.payerEmail || paymentData.payerEmail.trim() === '') {
            return { success: false, message: "E-mail do pagador é obrigatório." };
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

/**
 * Inicia o fluxo de assinatura de um plano via Mercado Pago (redirecionamento).
 */
export const handlePlanSubscription = async (planId: UserPlan, user: User): Promise<string> => {
    const plan = PLANS[planId];
    if (plan.price <= 0) {
        throw new Error("Este plano não requer pagamento.");
    }

    return createMercadoPagoPreference({
        title: `Assinatura GDN_IA - Plano ${plan.name}`,
        price: plan.price,
        quantity: 1,
        type: 'plan'
    }, user, { planId });
};

// Esta função agora prepara os dados para o checkout transparente,
// mas não inicia o processo de pagamento diretamente.
export const getMercadoPagoCheckoutData = async (creditsAmount: number, price: number, user: User) => {
    const settings = await getPaymentSettings();
    const mpConfig = settings.gateways.mercadoPago;

    if (!mpConfig.enabled || !mpConfig.publicKey) {
        throw new Error("Mercado Pago não está configurado. Por favor, contate o suporte ou configure-o no painel de administração.");
    }

    return {
        publicKey: mpConfig.publicKey,
        amount: price,
        description: `Pacote de ${creditsAmount} Créditos GDN_IA`,
        payerEmail: user.email,
        metadata: {
            item_type: 'credits',
            creditsAmount: creditsAmount,
        }
    };
};