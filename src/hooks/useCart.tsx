import { createContext, ReactNode, useContext, useState } from 'react';
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
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: productStock } = await api.get<Stock>(`stock/${productId}`);

      const cartProduct = cart.find(({ id }) => id === productId)

      const desiredAmount = cartProduct ? cartProduct.amount + 1 : 1;

      if (desiredAmount > productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      let updatedCart = []

      if (cartProduct) {
        updatedCart = cart.map(({ id, amount, ...rest }) => {
          return {
            id,
            ...rest,
            amount: id === productId ? desiredAmount : amount,
          }
        })
      } else {
        const { data: retrievedProduct } = await api.get<Omit<Product, 'amount'>>(`products/${productId}`)

        updatedCart = [...cart, {
          ...retrievedProduct,
          amount: 1,
        }]
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(({ id }) => id === productId)

      if (!product) throw Error;

      const updatedCart = cart.filter(({ id }) => id !== productId)

      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0) return

    try {
      const { data: productStock } = await api.get(`stock/${productId}`)

      if (productStock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const updatedCart = cart.map((product) => {
        return {
          ...product,
          amount: product.id === productId ? amount : product.amount,
        }
      })
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
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
