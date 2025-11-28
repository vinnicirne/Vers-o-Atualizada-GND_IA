
import { getPaymentSettings, processAffiliateCommission } from './adminService';
import { User } from '../types';
import { UserPlan } from '../types/plan.types';
import { api } from './api';
import { PLANS } from '../constants';

interface CardDetails {
    cardNumber: string;
    cardHolderName: string;
    expiryDate: string;
    cvc: string;
}

/**
 * Simulates a transparent Mercado Pago payment directly within the app.
 * In a real-world scenario, processing actual card details transparently
 * requires a secure backend for PCI compliance. This function is for demonstration purposes.
 *
 * @returns {Promise<{success: boolean; message: string}>} A promise that resolves with a success/error object.
 */
export const simulateTransparentMercadoPagoPayment = async (
    item: { title: string; price: number; quantity: number; type: 'plan' | 'credits' },
    user: User,
    cardDetails: CardDetails, // Mocked card details
    metadata?: any
): Promise<{ success: boolean; message: string }> => {
    try {
        // Simulate basic validation
        if (!cardDetails.cardNumber || !cardDetails.cardHolderName || !cardDetails.expiryDate || !cardDetails.cvc) {
            return { success: false, message: "Por favor, preencha todos os dados do cartão." };
        }
        if (cardDetails.cardNumber.replace(/\s/g, '').length !== 16) {
            return { success: false, message: "Número do cartão inválido. Deve ter 16 dígitos." };
        }
        if (item.price < 0.50 && item.type !== 'plan') { // Mercado Pago minimum is ~0.50 BRL for card payments
             return { success: false, message: "Valor mínimo para pagamento no cartão é R$ 0,50." };
        }

        // Simulate a network delay for payment processing
        await new Promise(resolve => setTimeout(resolve, 2000)); 

        console.log(`[SIMULAÇÃO] Processando pagamento transparente para: ${item.title} - R$ ${item.price}`);
        
        // 1. Registra a transação como 'approved' immediately for simulation purposes
        const { error } = await api.insert('transactions', {
            usuario_id: user.id,
            valor: item.price,
            metodo: 'card', // Assuming card for transparent checkout simulation
            status: 'approved', // MOCK: Aprovado direto para gerar comissão
            metadata: {
                item_type: item.type,
                plan_id: metadata?.planId,
                credits_amount: metadata?.creditsAmount,
                provider: 'mercado_pago_simulated_transparent',
                description: item.title,
                ...metadata 
            }
        });

        if (error) {
            console.error("Erro ao registrar intenção de transação:", error);
            return { success: false, message: "Erro ao registrar transação no banco de dados." };
        }

        // 2. Processa a Comissão do Afiliado (Se houver)
        // Só paga comissão se a transação for aprovada
        // Chamamos a função de forma fire-and-forget para não travar o fluxo
        processAffiliateCommission(user.id, item.price, `Comissão ref. ${item.title}`).catch(e => 
            console.error("Erro ao processar comissão:", e)
        );

        return { success: true, message: "Pagamento processado com sucesso!" };

    } catch (error: any) {
        console.error("Erro no pagamento simulado:", error);
        return { success: false, message: error.message || "Falha ao processar pagamento simulado." };
    }
};

export const handlePlanSubscription = async (planId: UserPlan, user: User, cardDetails: CardDetails): Promise<{ success: boolean; message: string }> => {
    const plan = PLANS[planId];
    if (plan.price <= 0) {
        return { success: true, message: `Plano ${plan.name} ativado com sucesso!` };
    }

    return simulateTransparentMercadoPagoPayment({
        title: `Upgrade GDN_IA - Plano ${plan.name}`,
        price: plan.price,
        quantity: 1,
        type: 'plan'
    }, user, cardDetails, { planId });
};

export const handleCreditPurchase = async (amount: number, price: number, user: User, cardDetails: CardDetails): Promise<{ success: boolean; message: string }> => {
    return simulateTransparentMercadoPagoPayment({
        title: `Pacote de ${amount} Créditos GDN_IA`,
        price: price,
        quantity: 1,
        type: 'credits'
    }, user, cardDetails, { creditsAmount: amount });
};