export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            categories: {
                Row: {
                    id: number
                    name: string
                }
                Insert: {
                    id?: number
                    name: string
                }
                Update: {
                    id?: number
                    name?: string
                }
            }
            products: {
                Row: {
                    id: number
                    name: string
                    category_id: number | null
                    sale_price: number
                    cost_price: number
                    current_stock: number
                    min_stock: number
                    is_active: boolean
                    description: string | null
                    image_url: string | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    name: string
                    category_id?: number | null
                    sale_price?: number
                    cost_price?: number
                    current_stock?: number
                    min_stock?: number
                    is_active?: boolean
                    description?: string | null
                    image_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    name?: string
                    category_id?: number | null
                    sale_price?: number
                    cost_price?: number
                    current_stock?: number
                    min_stock?: number
                    is_active?: boolean
                    description?: string | null
                    image_url?: string | null
                    created_at?: string
                }
            }
            menus: {
                Row: {
                    id: number
                    name: string
                    price: number
                    description: string | null
                    image_url: string | null
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    id?: number
                    name: string
                    price: number
                    description?: string | null
                    image_url?: string | null
                    is_active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: number
                    name?: string
                    price?: number
                    description?: string | null
                    image_url?: string | null
                    is_active?: boolean
                    created_at?: string
                }
            }
            menu_items: {
                Row: {
                    id: number
                    menu_id: number
                    product_id: number
                    quantity: number
                }
                Insert: {
                    id?: number
                    menu_id: number
                    product_id: number
                    quantity?: number
                }
                Update: {
                    id?: number
                    menu_id?: number
                    product_id?: number
                    quantity?: number
                }
            }
            restaurant_tables: {
                Row: {
                    id: number
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: number
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: number
                    name?: string
                    created_at?: string
                }
            }
            orders: {
                Row: {
                    id: number
                    type: 'sur_place' | 'en_ligne' | 'livraison'
                    status: 'en_attente' | 'en_preparation' | 'prete' | 'livree' | 'annulee'
                    total_amount: number
                    customer_id: string | null
                    customer_name: string | null
                    customer_phone: string | null
                    table_id: number | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    type: 'sur_place' | 'en_ligne' | 'livraison'
                    status?: 'en_attente' | 'en_preparation' | 'prete' | 'livree' | 'annulee'
                    total_amount?: number
                    customer_id?: string | null
                    customer_name?: string | null
                    customer_phone?: string | null
                    table_id?: number | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    type?: 'sur_place' | 'en_ligne' | 'livraison'
                    status?: 'en_attente' | 'en_preparation' | 'prete' | 'livree' | 'annulee'
                    total_amount?: number
                    customer_id?: string | null
                    customer_name?: string | null
                    customer_phone?: string | null
                    table_id?: number | null
                    created_at?: string
                }
            }
            order_items: {
                Row: {
                    id: number
                    order_id: number
                    product_id: number | null
                    menu_id: number | null
                    quantity: number
                    unit_price: number
                    line_total: number
                }
                Insert: {
                    id?: number
                    order_id: number
                    product_id?: number | null
                    menu_id?: number | null
                    quantity?: number
                    unit_price: number
                    line_total: number
                }
                Update: {
                    id?: number
                    order_id?: number
                    product_id?: number | null
                    menu_id?: number | null
                    quantity?: number
                    unit_price?: number
                    line_total?: number
                }
            }
            transactions: {
                Row: {
                    id: number
                    type: 'vente' | 'achat' | 'autre'
                    label: string
                    amount: number
                    date: string
                    created_at: string
                }
                Insert: {
                    id?: number
                    type: 'vente' | 'achat' | 'autre'
                    label: string
                    amount: number
                    date?: string
                    created_at?: string
                }
                Update: {
                    id?: number
                    type?: 'vente' | 'achat' | 'autre'
                    label?: string
                    amount?: number
                    date?: string
                    created_at?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    full_name: string | null
                    role: 'client' | 'cuisinier' | 'serveur' | 'caissier' | 'manager' | 'admin'
                    is_active: boolean
                    phone: string | null
                    address: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    full_name?: string | null
                    role?: 'client' | 'cuisinier' | 'serveur' | 'caissier' | 'manager' | 'admin'
                    is_active?: boolean
                    phone?: string | null
                    address?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    full_name?: string | null
                    role?: 'client' | 'cuisinier' | 'serveur' | 'caissier' | 'manager' | 'admin'
                    is_active?: boolean
                    phone?: string | null
                    address?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            decrement_product_stock: {
                Args: {
                    p_product_id: number
                    p_quantity: number
                }
                Returns: void
            }
            get_user_role: {
                Args: Record<PropertyKey, never>
                Returns: string
            }
            is_staff: {
                Args: Record<PropertyKey, never>
                Returns: boolean
            }
            is_kitchen_staff: {
                Args: Record<PropertyKey, never>
                Returns: boolean
            }
            is_manager_or_admin: {
                Args: Record<PropertyKey, never>
                Returns: boolean
            }
            is_admin: {
                Args: Record<PropertyKey, never>
                Returns: boolean
            }
            is_client: {
                Args: Record<PropertyKey, never>
                Returns: boolean
            }
        }
        Enums: {
            [_ in never]: never
        }
    }
}
