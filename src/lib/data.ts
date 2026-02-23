import { MenuItem } from '../types';

export const menuItems: MenuItem[] = [
    {
        id: 's1',
        name: 'Paneer Tikka',
        description: 'Cottage cheese marinated in yogurt and spices, roasted in tandoor.',
        price: 280,
        image: 'https://images.unsplash.com/photo-1599487405256-11f845014bd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
        isVeg: true,
        category: 'Starters',
        badge: 'bestseller',
    },
    {
        id: 's2',
        name: 'Dahi Ke Kebab',
        description: 'Melt in mouth kebabs made with hung curd and spices.',
        price: 240,
        image: 'https://images.unsplash.com/photo-1601344445837-d2c3df4492bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
        isVeg: true,
        category: 'Starters',
    },
    {
        id: 'm1',
        name: 'Dal Makhani',
        description: 'Black lentils cooked overnight with butter and cream. A Dhaba special.',
        price: 240,
        image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
        isVeg: true,
        category: 'Main Course',
        badge: 'chef-special',
    },
    {
        id: 'm2',
        name: 'Paneer Butter Masala',
        description: 'Cubes of cottage cheese cooked in a rich tomato gravy.',
        price: 290,
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc0?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
        isVeg: true,
        category: 'Main Course',
    },
    {
        id: 'b1',
        name: 'Butter Naan',
        description: 'Soft indian bread topped with butter.',
        price: 45,
        image: 'https://images.unsplash.com/photo-1626245009115-f55ee0eeef03?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
        isVeg: true,
        category: 'Breads',
    },
];

export const categories = ['Starters', 'Main Course', 'Biryani', 'Breads'];
