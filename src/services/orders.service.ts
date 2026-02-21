import { supabase } from '../lib/supabaseClient';
import type { Order, OrderStatus, OrderType } from '../types';

export interface CreateOrderDTO {
    type: OrderType;
    tableId: number | null;
    customerName: string;
    items: Array<{
        type: 'product' | 'menu';
        id: number;
        price: number;
        quantity: number;
    }>;
}

export const OrdersService = {
    /**
     * Fetch orders with optional status filter
     */
    async getOrders(limit = 50): Promise<Order[]> {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('orders')
            .select('*, restaurant_tables(name), order_items(*, products(name), menus(name))')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Transform to match application Order type structure if needed
        // The query returns restaurant_tables as an object, needed to map it
        return (data || []).map((o: any) => ({
            ...o,
            customer_name: o.restaurant_tables?.name || o.customer_name,
            items: o.order_items,
        }));
    },

    /**
     * Create a new order with items and associated transaction/stock updates
     */
    async createOrder(dto: CreateOrderDTO, totalAmount: number): Promise<Order> {
        if (!supabase) throw new Error('Supabase not configured');

        // 1. Create Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                type: dto.type,
                status: 'en_preparation', // Default status
                total_amount: totalAmount,
                table_id: dto.type === 'sur_place' ? dto.tableId : null,
                customer_name: dto.customerName || null,
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 2. Create Order Items
        const orderItems = dto.items.map((item) => ({
            order_id: order.id,
            product_id: item.type === 'product' ? item.id : null,
            menu_id: item.type === 'menu' ? item.id : null,
            quantity: item.quantity,
            unit_price: item.price,
            line_total: item.price * item.quantity,
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        if (itemsError) throw itemsError;

        // 3. Process Stock Updates (only for products)
        const stockUpdates = dto.items
            .filter((item) => item.type === 'product')
            .map((item) =>
                supabase!.rpc('decrement_product_stock', {
                    p_product_id: item.id,
                    p_quantity: item.quantity,
                })
            );

        // 4. Record Transaction & Execute Stock Updates
        await Promise.all([
            supabase.from('transactions').insert({
                type: 'vente',
                label: `Commande #${order.id}`,
                amount: totalAmount,
            }),
            ...stockUpdates,
        ]);

        return order;
    },

    /**
     * Update order status
     */
    async updateStatus(orderId: number, status: OrderStatus): Promise<void> {
        if (!supabase) return;

        const { error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', orderId);

        if (error) throw error;
    },

    /**
     * Validate order (move to prep + stock + transaction)
     * Note: This mimics the logic in StaffOrdersPage. In a real backend, this should be an Edge Function or Database Function.
     */
    async validateOrder(orderId: number, totalAmount: number, items: any[]): Promise<void> {
        if (!supabase) return;

        // 1. Update Status
        const { error: statusError } = await supabase
            .from('orders')
            .update({ status: 'en_preparation' })
            .eq('id', orderId);

        if (statusError) throw statusError;

        // 2. Stock Updates
        const stockUpdates = items
            .filter((item) => item.product_id)
            .map((item) =>
                supabase!.rpc('decrement_product_stock', {
                    p_product_id: item.product_id,
                    p_quantity: item.quantity,
                })
            );

        // 3. Transaction
        await Promise.all([
            supabase.from('transactions').insert({
                type: 'vente',
                label: `Commande #${orderId}`,
                amount: totalAmount,
            }),
            ...stockUpdates,
        ]);
    },

    /**
     * Subscribe to realtime updates
     */
    subscribeToOrders(callback: () => void) {
        if (!supabase) return () => { };

        const channel = supabase
            .channel('service-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
};
