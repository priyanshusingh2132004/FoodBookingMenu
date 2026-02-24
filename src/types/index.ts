export type BadgeType = 'bestseller' | 'chef-special' | 'none';

export interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    isVeg: boolean;
    category: string;
    badge?: BadgeType;
    inStock?: boolean;
}

export interface CartItem extends MenuItem {
    quantity: number;
}

export type OrderStatus = 'live' | 'preparing' | 'ready' | 'served' | 'cancelled';

export interface Order {
    id: string;
    tableId: string;
    items: CartItem[];
    total: number;
    status: OrderStatus;
    instructions?: string;
    timestamp: Date | string | Record<string, unknown>; // accommodate Firestore Timestamp
}
