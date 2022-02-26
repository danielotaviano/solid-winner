import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const setNewCart = (newCart: Product[]) => {
    setCart(newCart);
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
  };

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (stock.amount < 0) {
        toast.error('Erro ao adicionar o produto');
        return
      }

      const { data: product } = await api.get<Product>(`/products/${productId}`);

      const productExists = cart.find(p => p.id === product.id);

      if (productExists) {
        updateProductAmount({ productId, amount: productExists.amount + 1 });
        return
      }

      setNewCart([...cart, { ...product, amount: 1 }]);
    } catch (e) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);
      if (!product) {
        toast.error('Erro na remoção do produto');
        return
      }
      setNewCart(cart.filter(product => product.id !== productId));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (amount <= 0) {
        return;
      }

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const product = cart.find(product => product.id === productId);
      if (!product) {
        toast.error('Erro na atualização do produto');
        return;
      }

      setNewCart(cart.map(product => product.id === productId ? { ...product, amount } : product));
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
