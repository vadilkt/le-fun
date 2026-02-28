import { supabase } from '../lib/supabaseClient';
import type { Product, Menu, Category, RestaurantTable } from '../types';

export const ProductsService = {
    /**
     * Fetch all active products
     */
    async getActiveProducts(): Promise<Product[]> {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        return data || [];
    },

    /**
     * Fetch all active menus
     */
    async getActiveMenus(): Promise<Menu[]> {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('menus')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        return data || [];
    },

    /**
     * Fetch all categories
     */
    async getCategories(): Promise<Category[]> {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    },

    /**
     * Fetch all tables
     */
    async getTables(): Promise<RestaurantTable[]> {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('restaurant_tables')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    }
};
