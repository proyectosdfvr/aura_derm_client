import React, { useState, useRef, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

// --- Configuration & Data ---

const WHATSAPP_NUMBER = "573017727626";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCDM_LgnWL312YtwFmq6UCuiNF-r7MuRoM",
    authDomain: "auraderm-5e4eb.firebaseapp.com",
    projectId: "auraderm-5e4eb",
    storageBucket: "auraderm-5e4eb.firebasestorage.app",
    messagingSenderId: "856211033282",
    appId: "1:856211033282:web:52a62c47ad2aa57759bf5b",
    measurementId: "G-4KN65Y9XMK"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Interfaces ---

interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number | string;
  imagenUrl: string;
  imagenesUrls?: string[]; // Array de múltiples imágenes
  categoria?: string;
  stock?: number;
  beneficios?: string[]; // Added benefits array
}

interface CartItem extends Product {
  precio: number;
  quantity: number;
}

// --- Utilities ---

const parsePrice = (price: number | string): number => {
  if (typeof price === 'number') return price;
  if (typeof price === 'string') {
    return parseFloat(price.replace(/[$.]/g, '').replace(/,/g, ''));
  }
  return 0;
};

const formatPrice = (price: number | string) => {
  const numPrice = parsePrice(price);
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(numPrice);
};

const generateWhatsAppLink = (items: CartItem[], total: number, customerData?: { name: string, city: string }) => {
  let message = `🌸 *RECIBO DE PEDIDO - AuraDerm* 🌸\n\n`;
  message += `📋 *DETALLE DEL PEDIDO*\n\n`;
  
  items.forEach(item => {
    message += `• ${item.nombre}\n`;
    message += `  Cantidad: ${item.quantity}\n`;
    message += `  Precio unitario: ${formatPrice(item.precio)}\n`;
    message += `  Subtotal: ${formatPrice(item.precio * item.quantity)}\n\n`;
  });
  
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 *TOTAL PRODUCTOS:* ${formatPrice(total)}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (customerData) {
    message += `👤 *Datos del Cliente:*\n`;
    message += `Nombre: ${customerData.name}\n`;
    message += `Ciudad: ${customerData.city}\n\n`;
  }

  message += `📦 El costo de envío se confirmará según tu ciudad.\n\n`;
  message += `¡Gracias por tu compra! 💖`;

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};

// --- Gemini AI Setup ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const createOrderTool: FunctionDeclaration = {
  name: "createOrder",
  parameters: {
    type: Type.OBJECT,
    description: "Generar un enlace de pedido de WhatsApp para el cliente basado en los productos que quiere.",
    properties: {
      productNames: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Lista de nombres de productos que el usuario quiere comprar."
      },
      customerName: {
        type: Type.STRING,
        description: "Nombre del cliente."
      },
      customerCity: {
        type: Type.STRING,
        description: "Ciudad del cliente."
      }
    },
    required: ["productNames", "customerName", "customerCity"]
  }
};

// --- Components ---

function Header({ cartCount, onOpenCart, logoUrl }: { cartCount: number, onOpenCart: () => void, logoUrl: string | null }) {
  return (
    <nav className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-40 transition-all duration-300 border-b border-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="AuraDerm Logo" className="h-12 w-12 rounded-full object-cover border border-pink-100 shadow-sm" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-pink-400 flex items-center justify-center text-white animate-pulse">
                <i className="fas fa-leaf text-sm"></i>
              </div>
            )}
            <span className="text-2xl font-bold text-gray-800 font-serif tracking-tight">
              Aura<span className="text-[#FF6B9D]">Derm</span>
            </span>
          </div>
          
          <div className="hidden md:flex space-x-8">
            <a href="#products" className="text-gray-600 hover:text-[#FF6B9D] transition font-medium text-sm tracking-wide">COLECCIÓN</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-[#FF6B9D] transition font-medium text-sm tracking-wide">CÓMO COMPRAR</a>
            <a href="#community" className="text-gray-600 hover:text-[#FF6B9D] transition font-medium text-sm tracking-wide">COMUNIDAD</a>
            <a href="#contact" className="text-gray-600 hover:text-[#FF6B9D] transition font-medium text-sm tracking-wide">CONTACTO</a>
          </div>

          <button 
            onClick={onOpenCart}
            className="relative p-2 text-gray-600 hover:text-[#FF6B9D] transition group"
          >
            <i className="fas fa-shopping-bag text-2xl group-hover:scale-110 transition-transform"></i>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FF6B9D] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <div className="relative bg-[#fff0f5] pt-16 pb-24 lg:pt-32 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm text-[#C74375] text-xs font-bold mb-8 tracking-widest uppercase border border-pink-100">
              <i className="fas fa-sparkles text-[#FF6B9D]"></i> Nueva Fórmula 2025
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold text-gray-900 mb-6 font-serif leading-[1.1]">
              Tu Piel Cuenta <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B9D] to-[#ff8da1]">Una Historia</span>
            </h1>
            <p className="text-lg text-gray-600 mb-10 max-w-lg mx-auto lg:mx-0 font-light leading-relaxed">
              Únete a nuestra comunidad de mujeres que eligen cuidarse con amor. Productos dermatológicos que realzan tu belleza natural sin filtros.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a href="#products" className="bg-[#FF6B9D] text-white px-10 py-4 rounded-full font-semibold hover:bg-[#C74375] transition shadow-xl shadow-pink-200/50 transform hover:-translate-y-1">
                Ver Colección
              </a>
              <a href="#community" className="bg-white text-gray-700 px-10 py-4 rounded-full font-semibold border border-gray-200 hover:border-[#FF6B9D] hover:text-[#FF6B9D] transition shadow-sm hover:shadow-md">
                Leer Tips
              </a>
            </div>
          </div>
          
          <div className="relative">
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border-8 border-white">
                <img 
                src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80" 
                alt="Mujer cuidando su piel" 
                className="w-full h-[600px] object-cover hover:scale-105 transition duration-1000"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-8 text-white">
                    <p className="font-serif italic text-xl">"La belleza comienza en el momento en que decides ser tú misma."</p>
                </div>
            </div>
            {/* Floating Card */}
            <div className="absolute -bottom-10 -left-10 bg-white p-4 rounded-2xl shadow-xl hidden md:block animate-float">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <i className="fas fa-leaf text-xl"></i>
                    </div>
                    <div>
                        <p className="font-bold text-gray-800">100% Natural</p>
                        <p className="text-xs text-gray-500">Ingredientes puros</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Benefits() {
  const benefits = [
    { icon: "fa-shipping-fast", title: "Envío Rápido", desc: "A toda Colombia en 2-4 días." },
    { icon: "fa-hand-holding-heart", title: "Pago Seguro", desc: "Paga solo al recibir tu pedido." },
    { icon: "fa-comments", title: "Asesoría Real", desc: "Expertas disponibles en WhatsApp." },
    { icon: "fa-gem", title: "Calidad Premium", desc: "Fórmulas probadas y efectivas." }
  ];

  return (
    <section id="benefits" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-bold text-gray-900">¿Por qué elegir AuraDerm?</h2>
            <p className="text-gray-500 mt-2">Más que productos, te ofrecemos una experiencia.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {benefits.map((b, idx) => (
            <div key={idx} className="text-center p-8 rounded-3xl bg-[#fff9fb] hover:bg-white hover:shadow-xl transition duration-500 border border-transparent hover:border-pink-100 group">
              <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center mb-6 text-[#FF6B9D] text-3xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                <i className={`fas ${b.icon}`}></i>
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-lg">{b.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
    return (
        <section id="how-it-works" className="py-20 bg-pink-50/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <span className="text-[#FF6B9D] font-bold text-xs uppercase tracking-widest">Paso a Paso</span>
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mt-2">¿Cómo comprar?</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="relative">
                        <div className="bg-white p-8 rounded-3xl shadow-sm h-full relative z-10 border border-pink-100">
                            <span className="absolute -top-6 left-8 text-8xl font-serif text-pink-100/50 font-bold -z-10">1</span>
                            <h3 className="text-xl font-bold mb-4 mt-2">Elige tus favoritos</h3>
                            <p className="text-gray-600">Navega por nuestra colección y agrega al carrito lo que tu piel necesita.</p>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="bg-white p-8 rounded-3xl shadow-sm h-full relative z-10 border border-pink-100">
                             <span className="absolute -top-6 left-8 text-8xl font-serif text-pink-100/50 font-bold -z-10">2</span>
                            <h3 className="text-xl font-bold mb-4 mt-2">Confirma en WhatsApp</h3>
                            <p className="text-gray-600">Al finalizar, se abrirá un chat con nosotras para coordinar el envío.</p>
                        </div>
                    </div>
                    <div className="relative">
                         <div className="bg-white p-8 rounded-3xl shadow-sm h-full relative z-10 border border-pink-100">
                             <span className="absolute -top-6 left-8 text-8xl font-serif text-pink-100/50 font-bold -z-10">3</span>
                            <h3 className="text-xl font-bold mb-4 mt-2">Paga al recibir</h3>
                            <p className="text-gray-600">Recibe tu paquete en la puerta de tu casa y paga en efectivo. ¡Sin riesgos!</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ProductModal({ product, isOpen, onClose, addToCart }: { product: Product | null, isOpen: boolean, onClose: () => void, addToCart: (p: Product) => void }) {
    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden relative z-10 animate-fade-in-up flex flex-col md:flex-row max-h-[90vh]">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 transition hover:bg-white"
                >
                    <i className="fas fa-times text-xl"></i>
                </button>

                {/* Image Side */}
                <div className="w-full md:w-1/2 h-64 md:h-auto bg-gray-100 relative">
                    <ProductImageCarousel images={product.imagenesUrls || [product.imagenUrl]} />
                    {product.stock === 0 && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-30">
                            <span className="bg-red-500 text-white px-6 py-2 rounded-full font-bold">AGOTADO</span>
                        </div>
                    )}
                </div>

                {/* Details Side */}
                <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto">
                    <div className="mb-2">
                         <span className="text-[#FF6B9D] font-bold text-xs uppercase tracking-widest">{product.categoria || 'Cuidado Facial'}</span>
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">{product.nombre}</h2>
                    <p className="text-2xl font-bold text-[#C74375] mb-6">{formatPrice(product.precio)}</p>
                    
                    <div className="prose prose-sm text-gray-600 mb-8">
                        <p className="text-base leading-relaxed">{product.descripcion}</p>
                    </div>

                    {product.beneficios && (
                        <div className="mb-8 bg-pink-50 p-6 rounded-2xl">
                            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <i className="fas fa-star text-[#FF6B9D]"></i> Beneficios Clave
                            </h4>
                            <ul className="space-y-2">
                                {/* If beneficios is array, map it. If string, split it. Handling both for safety */}
                                {(Array.isArray(product.beneficios) ? product.beneficios : [product.beneficios]).map((b: any, idx) => (
                                     <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                        <i className="fas fa-check text-green-500 mt-1"></i>
                                        <span>{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex gap-4">
                         <button 
                            onClick={() => { addToCart(product); onClose(); }}
                            disabled={product.stock === 0}
                            className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition transform active:scale-95 ${
                                product.stock === 0 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-[#FF6B9D] text-white hover:bg-[#C74375] shadow-lg shadow-pink-200'
                            }`}
                        >
                            <i className="fas fa-shopping-bag"></i>
                            {product.stock === 0 ? 'Sin Stock' : 'Agregar al Carrito'}
                        </button>
                    </div>
                    <div className="mt-6 text-center text-xs text-gray-400">
                        <i className="fas fa-lock mr-1"></i> Compra segura con pago contraentrega
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProductGrid({ products, addToCart, loading, onProductClick }: { products: Product[], addToCart: (product: Product) => void, loading: boolean, onProductClick: (p: Product) => void }) {
  return (
    <section id="products" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-[#FF6B9D] font-semibold tracking-wider uppercase text-sm">Shop Online</span>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mt-2 mb-6 font-serif">Nuestra Colección</h2>
          <div className="w-24 h-1 bg-[#FF6B9D] mx-auto rounded-full"></div>
        </div>
        
        {loading ? (
           <div className="flex flex-col items-center justify-center py-20">
             <div className="w-16 h-16 border-4 border-pink-100 border-t-[#FF6B9D] rounded-full animate-spin mb-4"></div>
             <p className="text-gray-400 font-medium tracking-wide">Preparando tu belleza...</p>
           </div>
        ) : products.length === 0 ? (
           <div className="text-center py-20 bg-gray-50 rounded-3xl">
             <i className="fas fa-box-open text-4xl mb-4 text-gray-300"></i>
             <p className="text-gray-500">No hay productos disponibles por el momento.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {products.map((product) => (
              <div key={product.id} className="group bg-white rounded-3xl overflow-hidden hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 border border-gray-100 flex flex-col h-full">
                <div
                    className="relative h-80 overflow-hidden bg-gray-100 cursor-pointer"
                    onClick={() => onProductClick(product)}
                >
                  <ProductImageCarousel images={product.imagenesUrls || [product.imagenUrl]} />
                  {/* Quick Add Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition duration-300 z-20">
                      <button
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onProductClick(product); }}
                        className="w-full bg-white/95 backdrop-blur text-gray-900 font-bold py-3 rounded-xl shadow-lg hover:bg-[#FF6B9D] hover:text-white transition"
                      >
                          Ver Detalles
                      </button>
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                     <h3 
                        className="text-lg font-bold text-gray-900 font-serif cursor-pointer hover:text-[#FF6B9D] transition"
                        onClick={() => onProductClick(product)}
                     >
                         {product.nombre}
                     </h3>
                  </div>
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">{product.descripcion}</p>
                  
                  <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4">
                    <span className="text-xl font-bold text-[#C74375]">{formatPrice(product.precio)}</span>
                    <button 
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow-sm border ${
                          product.stock === 0 
                          ? 'bg-gray-100 border-gray-200 text-gray-400' 
                          : 'bg-white border-pink-200 text-[#FF6B9D] hover:bg-[#FF6B9D] hover:text-white hover:border-[#FF6B9D]'
                      }`}
                      title="Agregar al carrito"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface Article {
    id: string;
    category: string;
    title: string;
    excerpt: string;
    content: string[];
    image: string;
    author: string;
    date: string;
    readTime: string;
}

const BLOG_ARTICLES: Article[] = [
    {
        id: 'skincare-order',
        category: 'RUTINA',
        title: 'El orden correcto de tu Skincare',
        excerpt: '¿Va primero el serum o la crema? Descubre la guía definitiva para aprovechar al máximo tus productos.',
        image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
        author: 'Dra. Carolina Mendoza',
        date: '15 de Diciembre, 2025',
        readTime: '5 min',
        content: [
            'El orden en que aplicas tus productos de skincare es crucial para maximizar su efectividad. La regla general es aplicar los productos de la textura más ligera a la más pesada, permitiendo que cada capa se absorba correctamente.',
            '**Rutina de la Mañana:**',
            '1. **Limpiador Suave** - Elimina impurezas acumuladas durante la noche',
            '2. **Tónico** - Equilibra el pH y prepara la piel',
            '3. **Serum de Vitamina C** - Protección antioxidante y luminosidad',
            '4. **Contorno de Ojos** - Hidratación específica para el área delicada',
            '5. **Crema Hidratante** - Sella la hidratación',
            '6. **Protector Solar SPF 50+** - ¡El paso más importante!',
            '**Rutina de la Noche:**',
            '1. **Desmaquillante/Limpiador Doble** - Elimina maquillaje y protector solar',
            '2. **Limpiador Facial** - Segunda limpieza profunda',
            '3. **Tónico** - Reequilibra la piel',
            '4. **Serum de Retinol o Ácido Hialurónico** - Tratamiento activo',
            '5. **Contorno de Ojos** - Versión más rica para la noche',
            '6. **Crema de Noche** - Reparación mientras duermes',
            '**Tips Importantes:**',
            '• Espera 30-60 segundos entre cada producto para que se absorba',
            '• No mezcles activos incompatibles (ej: retinol + vitamina C en la misma rutina)',
            '• El protector solar SIEMPRE va al final en la mañana',
            '• Menos es más: usar demasiado producto puede saturar la piel',
            'Recuerda que la consistencia es clave. Los resultados visibles toman de 4 a 8 semanas de uso regular.'
        ]
    },
    {
        id: 'retinol-vitamin-c',
        category: 'INGREDIENTES',
        title: 'Retinol vs Vitamina C',
        excerpt: 'Todo lo que necesitas saber sobre los ingredientes activos más poderosos del mercado.',
        image: 'https://images.unsplash.com/photo-1552693673-1bf958298935?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
        author: 'Dra. María Fernanda López',
        date: '12 de Diciembre, 2025',
        readTime: '7 min',
        content: [
            'El retinol y la vitamina C son los ingredientes estrella en el cuidado de la piel, pero cada uno tiene propósitos diferentes y se usan en momentos distintos del día.',
            '**RETINOL - El Rey del Anti-Edad**',
            '**¿Qué es?** Un derivado de la vitamina A que acelera la renovación celular.',
            '**Beneficios:**',
            '• Reduce líneas finas y arrugas',
            '• Mejora la textura de la piel',
            '• Minimiza poros dilatados',
            '• Unifica el tono y reduce manchas',
            '• Estimula producción de colágeno',
            '**Cómo usarlo:**',
            '• SOLO de noche (se inactiva con el sol)',
            '• Empezar con concentraciones bajas (0.25% - 0.5%)',
            '• Aplicar 2-3 veces por semana al inicio',
            '• Aumentar gradualmente la frecuencia',
            '• SIEMPRE usar protector solar al día siguiente',
            '**Resultados:** Se ven entre 4-12 semanas',
            '**VITAMINA C - El Escudo Luminoso**',
            '**¿Qué es?** Un poderoso antioxidante que protege y revitaliza.',
            '**Beneficios:**',
            '• Protege contra radicales libres',
            '• Ilumina y da luminosidad instantánea',
            '• Reduce manchas y unifica tono',
            '• Previene signos de envejecimiento',
            '• Refuerza la efectividad del protector solar',
            '**Cómo usarla:**',
            '• Ideal por la MAÑANA',
            '• Buscar concentraciones del 10-20%',
            '• Aplicar sobre piel limpia',
            '• Debe ser estable (ácido L-ascórbico)',
            '• Guardar en lugar fresco y oscuro',
            '**Resultados:** Se ven entre 2-4 semanas',
            '**¿Se pueden usar juntos?**',
            '¡SÍ! Pero NO en la misma aplicación. La combinación perfecta:',
            '• **Mañana:** Vitamina C + Protector Solar',
            '• **Noche:** Retinol + Crema Hidratante',
            'Esta combinación ofrece protección durante el día y reparación durante la noche, maximizando los beneficios de ambos ingredientes sin causar irritación.',
            '**Advertencia:** Si tienes piel sensible, introduce estos activos gradualmente y siempre haz una prueba de parche primero.'
        ]
    },
    {
        id: 'hydration-guide',
        category: 'CUIDADO',
        title: 'Guía Completa de Hidratación',
        excerpt: 'Aprende la diferencia entre hidratación y humectación, y cómo elegir los productos correctos para tu tipo de piel.',
        image: 'https://images.unsplash.com/photo-1556228852-80a9e4a76d9f?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
        author: 'Dra. Carolina Mendoza',
        date: '10 de Diciembre, 2025',
        readTime: '6 min',
        content: [
            'La hidratación es fundamental para una piel sana, pero hay mucha confusión sobre qué productos usar y cuándo.',
            '**Hidratación vs Humectación:**',
            '**Hidratantes (Humectantes):** Atraen agua a la piel',
            '• Ácido Hialurónico',
            '• Glicerina',
            '• Aloe Vera',
            '• Urea',
            '**Emolientes:** Suavizan y rellenan espacios entre células',
            '• Ceramidas',
            '• Escualano',
            '• Mantecas naturales',
            '**Oclusivos:** Sellan la humedad',
            '• Aceites minerales',
            '• Vaselina',
            '• Dimeticona',
            '**La fórmula perfecta incluye los TRES tipos.**',
            '**Por Tipo de Piel:**',
            '**Piel Seca:**',
            '• Busca cremas ricas con ceramidas',
            '• Aplica sobre piel húmeda',
            '• Usa aceites faciales por la noche',
            '• Humidificador en tu habitación',
            '**Piel Grasa:**',
            '• Gel-cremas oil-free',
            '• Ácido hialurónico en serum',
            '• Evita ingredientes comedogénicos',
            '• No saltes la hidratación (¡es un mito!)',
            '**Piel Mixta:**',
            '• Hidratante ligero en zona T',
            '• Crema más rica en mejillas',
            '• Considera productos en capas',
            '**Piel Sensible:**',
            '• Fórmulas minimalistas',
            '• Sin fragancias ni alcohol',
            '• Ingredientes calmantes (centella, niacinamida)',
            '**Errores Comunes:**',
            '❌ Aplicar crema sobre piel completamente seca',
            '✅ Aplicar sobre piel ligeramente húmeda',
            '❌ Usar solo crema sin serum',
            '✅ Capas: serum hidratante + crema',
            '❌ La misma crema todo el año',
            '✅ Ajustar según el clima',
            '**El Método de Capas (Layering):**',
            '1. Tónico hidratante (textura acuosa)',
            '2. Esencia o serum (ácido hialurónico)',
            '3. Emulsión o loción ligera',
            '4. Crema (sella todo)',
            'Recuerda: Una piel bien hidratada es la base para que todos los demás productos funcionen correctamente.'
        ]
    },
    {
        id: 'sunscreen-myths',
        category: 'PROTECCIÓN',
        title: 'Mitos del Protector Solar Desmentidos',
        excerpt: 'La verdad sobre el SPF, reaplicación, y por qué es el producto más importante de tu rutina.',
        image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
        author: 'Dra. María Fernanda López',
        date: '8 de Diciembre, 2025',
        readTime: '8 min',
        content: [
            'El protector solar es el paso MÁS importante de tu rutina, pero hay muchos mitos que impiden que lo uses correctamente.',
            '**MITO #1: "No necesito protector solar en días nublados"**',
            '**FALSO.** Hasta el 80% de los rayos UV penetran las nubes. Los días nublados aún causan daño UV acumulativo.',
            '**MITO #2: "El SPF 100 me protege el doble que el SPF 50"**',
            '**FALSO.** La diferencia es mínima:',
            '• SPF 30 = 97% protección',
            '• SPF 50 = 98% protección',
            '• SPF 100 = 99% protección',
            'Lo importante es la REAPLICACIÓN, no un número más alto.',
            '**MITO #3: "Con el protector del maquillaje es suficiente"**',
            '**FALSO.** Necesitarías aplicar 7 capas de base para alcanzar el SPF indicado. Siempre usa protector dedicado primero.',
            '**MITO #4: "No necesito protector en interiores"**',
            '**PARCIALMENTE FALSO.** Los rayos UVA penetran ventanas. Si trabajas cerca de ventanas, úsalo.',
            '**MITO #5: "Debo esperar 30 minutos antes de salir"**',
            '**FALSO para protectores modernos.** Los filtros químicos actuales protegen inmediatamente. Los físicos (zinc, titanio) protegen al contacto.',
            '**VERDADES IMPORTANTES:**',
            '**✅ Debes reaplicar cada 2 horas**',
            'Especialmente si:',
            '• Estás al aire libre',
            '• Sudas',
            '• Nadas o haces ejercicio',
            '• Te secas con toalla',
            '**✅ La cantidad importa**',
            'Regla del "dos dedos":',
            '• Cara y cuello: dos dedos de producto',
            '• La mayoría usa solo el 25% de lo necesario',
            '• ¡Sé generosa!',
            '**✅ Todos los tonos de piel necesitan protección**',
            'Aunque la piel oscura tiene más melanina, aún es vulnerable a:',
            '• Cáncer de piel',
            '• Envejecimiento prematuro',
            '• Hiperpigmentación',
            '**CÓMO ELEGIR TU PROTECTOR:**',
            '**Para piel grasa:**',
            '• Texturas gel o fluidas',
            '• Oil-free, no comedogénico',
            '• Con niacinamida (controla brillo)',
            '**Para piel seca:**',
            '• Fórmulas con hidratantes',
            '• Base cremosa',
            '• Con ácido hialurónico',
            '**Para piel sensible:**',
            '• Filtros físicos (zinc, titanio)',
            '• Sin fragancias',
            '• Hipoalergénico',
            '**Para piel con acné:**',
            '• Non-comedogenic',
            '• Oil-free',
            '• Con ingredientes calmantes',
            '**TIPOS DE FILTROS:**',
            '**Físicos (Minerales):**',
            '• Óxido de zinc, dióxido de titanio',
            '• Protección inmediata',
            '• Mejor para piel sensible',
            '• Pueden dejar tono blanco',
            '**Químicos (Orgánicos):**',
            '• Absorben rayos UV',
            '• Texturas más ligeras',
            '• Sin tono blanco',
            '• Algunos pueden irritar',
            '**Híbridos:**',
            '• Combinan ambos tipos',
            '• Balance perfecto',
            '**TIP PROFESIONAL:**',
            'Aplica tu protector solar como ÚLTIMO paso del skincare y ANTES del maquillaje. Espera 1-2 minutos antes del maquillaje para que se absorba.',
            '**Para reaplicar con maquillaje:**',
            '• Polvos con SPF',
            '• Sprays faciales con SPF',
            '• Cushions con SPF',
            'El protector solar no es opcional, es ESENCIAL. Es la mejor inversión anti-edad que puedes hacer.'
        ]
    },
    {
        id: 'acne-solutions',
        category: 'TRATAMIENTO',
        title: 'Soluciones Reales para el Acné Adulto',
        excerpt: 'El acné no es solo de adolescentes. Descubre tratamientos efectivos para el acné hormonal y adulto.',
        image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
        author: 'Dra. Carolina Mendoza',
        date: '5 de Diciembre, 2025',
        readTime: '9 min',
        content: [
            'El acné adulto afecta al 40-55% de mujeres entre 20-40 años. No estás sola, y sí tiene solución.',
            '**TIPOS DE ACNÉ ADULTO:**',
            '**Acné Hormonal:**',
            '• Aparece en zona U (mandíbula, mentón)',
            '• Empeora antes del periodo',
            '• Quistes profundos y dolorosos',
            '• Difícil de tratar tópicamente solo',
            '**Acné por Estrés:**',
            '• Brotes repentinos',
            '• Zonas variadas',
            '• Relacionado con cortisol elevado',
            '**Acné Cosmético:**',
            '• Por productos comedogénicos',
            '• Pequeños granitos constantes',
            '• Mejora al cambiar productos',
            '**INGREDIENTES QUE FUNCIONAN:**',
            '**Ácido Salicílico (BHA):**',
            '• Penetra poros',
            '• Exfolia desde adentro',
            '• Antiinflamatorio',
            '• Concentración: 0.5-2%',
            '• Usar: Día y/o noche',
            '**Niacinamida:**',
            '• Regula sebo',
            '• Reduce inflamación',
            '• Minimiza marcas',
            '• Concentración: 5-10%',
            '• Usar: AM y PM',
            '**Retinoides:**',
            '• Previenen obstrucción de poros',
            '• Aceleran renovación celular',
            '• Reducen marcas post-acné',
            '• Empezar con retinol 0.25%',
            '• Usar: Solo PM',
            '**Peróxido de Benzoilo:**',
            '• Mata bacteria del acné',
            '• Tratamiento localizado',
            '• Concentración: 2.5-5%',
            '• Advertencia: puede decolorar telas',
            '**Ácido Azelaico:**',
            '• Multifunción: acné + manchas',
            '• Apto para piel sensible',
            '• Concentración: 10-20%',
            '• Usar: AM o PM',
            '**RUTINA ANTI-ACNÉ COMPLETA:**',
            '**MAÑANA:**',
            '1. Limpiador suave con ácido salicílico',
            '2. Tónico calmante',
            '3. Serum de niacinamida 10%',
            '4. Crema hidratante oil-free',
            '5. Protector solar no comedogénico SPF 50+',
            '**NOCHE:**',
            '1. Limpiador doble (aceite + espuma)',
            '2. Tónico exfoliante con BHA/AHA',
            '3. Tratamiento: retinol o ácido azelaico',
            '4. Spot treatment: peróxido de benzoilo en granitos activos',
            '5. Crema reparadora ligera',
            '**LO QUE DEBES EVITAR:**',
            '❌ Reventar o exprimir (causa cicatrices)',
            '❌ Sobre-exfoliar (empeora inflamación)',
            '❌ Aceites comedogénicos (coco, oliva en cara)',
            '❌ Productos con alcohol denat (reseca)',
            '❌ Fragancias fuertes (pueden irritar)',
            '❌ Cambiar productos cada semana (da tiempo)',
            '**CUÁNDO VER UN DERMATÓLOGO:**',
            '• Acné quístico profundo',
            '• No mejora en 8-12 semanas',
            '• Deja cicatrices',
            '• Afecta tu autoestima',
            '• Sospecha de causa hormonal',
            '**Tratamientos profesionales:**',
            '• Anticonceptivos hormonales (para acné hormonal)',
            '• Espironolactona',
            '• Isotretinoína (casos severos)',
            '• Peelings químicos',
            '• Terapia con láser',
            '**TIPS DE ESTILO DE VIDA:**',
            '✅ Cambia la funda de almohada 2x semana',
            '✅ Limpia tu teléfono diariamente',
            '✅ No toques tu cara durante el día',
            '✅ Desmaquilla siempre antes de dormir',
            '✅ Bebe 2-3 litros de agua al día',
            '✅ Reduce lácteos y azúcares refinados',
            '✅ Maneja el estrés (yoga, meditación)',
            '✅ Duerme 7-8 horas',
            '**MARCAS POST-ACNÉ:**',
            'Para desvanecer manchas oscuras:',
            '• Vitamina C por la mañana',
            '• Retinol por la noche',
            '• Niacinamida día y noche',
            '• Ácido azelaico',
            '• PROTECTOR SOLAR obligatorio',
            'Las marcas toman 3-6 meses en desvanecerse con tratamiento constante.',
            '**RECUERDA:**',
            'El acné es una condición médica, no falta de higiene. Sé paciente contigo misma, los resultados toman tiempo (mínimo 6-8 semanas). La consistencia es más importante que la perfección.'
        ]
    },
    {
        id: 'anti-aging-essentials',
        category: 'ANTI-EDAD',
        title: 'Anti-Edad: Lo Esencial',
        excerpt: 'Los 5 productos que realmente funcionan para prevenir y tratar signos de envejecimiento.',
        image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
        author: 'Dra. María Fernanda López',
        date: '3 de Diciembre, 2025',
        readTime: '7 min',
        content: [
            'No necesitas 20 productos. Estos 5 son los únicos con evidencia científica real de efectividad anti-edad.',
            '**#1: PROTECTOR SOLAR (El más importante)**',
            '**Por qué funciona:**',
            '• 80% del envejecimiento visible es por el sol',
            '• Previene arrugas, manchas, pérdida de firmeza',
            '• Es PREVENCIÓN, no solo protección',
            '**Cómo usarlo:**',
            '• SPF 50+ broad spectrum',
            '• Cantidad: 2 dedos para cara y cuello',
            '• Reaplicar cada 2 horas si estás al exterior',
            '• TODOS LOS DÍAS, incluso nublados',
            '**Resultado:** Prevención del 80% del envejecimiento prematuro',
            '**#2: RETINOIDES (El estándar dorado)**',
            '**Por qué funciona:**',
            '• Único ingrediente con 50+ años de estudios',
            '• Estimula producción de colágeno',
            '• Acelera renovación celular',
            '• Reduce arrugas existentes',
            '**Tipos y concentraciones:**',
            '• Principiante: Retinol 0.25-0.3%',
            '• Intermedio: Retinol 0.5-1%',
            '• Avanzado: Tretinoína recetada',
            '• Alternativa suave: Bakuchiol',
            '**Cómo usarlo:**',
            '• SOLO por la noche',
            '• Empezar 2x semana, aumentar gradualmente',
            '• Sobre piel seca (espera 20 min post-limpieza)',
            '• Cantidad: tamaño de un guisante',
            '• Obligatorio protector solar al día siguiente',
            '**Resultados:** 8-12 semanas para líneas finas, 6-12 meses para arrugas profundas',
            '**#3: VITAMINA C (Antioxidante esencial)**',
            '**Por qué funciona:**',
            '• Protege contra radicales libres',
            '• Estimula producción de colágeno',
            '• Ilumina y unifica tono',
            '• Refuerza protector solar',
            '**Forma efectiva:**',
            '• Ácido L-ascórbico 10-20%',
            '• pH entre 2.5-3.5',
            '• Empaque opaco y airless',
            '• Fórmula estable (si huele rancio, tíralo)',
            '**Cómo usarlo:**',
            '• Por la MAÑANA',
            '• Sobre piel limpia, antes de crema',
            '• Guardar en lugar fresco',
            '• Reemplazar cada 3-6 meses',
            '**Resultados:** 2-4 semanas para luminosidad, 8-12 para tono uniforme',
            '**#4: ÁCIDO HIALURÓNICO (Hidratación profunda)**',
            '**Por qué funciona:**',
            '• Retiene 1000x su peso en agua',
            '• Rellena líneas de deshidratación',
            '• Mejora textura y suavidad',
            '• Apto para todos los tipos de piel',
            '**Peso molecular:**',
            '• Alto peso: hidratación superficial',
            '• Bajo peso: penetra más profundo',
            '• Multi-peso: mejor opción',
            '**Cómo usarlo:**',
            '• AM y PM, después de limpiar',
            '• Sobre piel HÚMEDA (crucial)',
            '• Seguir con crema para sellar',
            '• En climas muy secos, combinar con humectante',
            '**Resultados:** Inmediato para hidratación, 4-6 semanas para textura',
            '**#5: PEPTIDOS (Comunicadores celulares)**',
            '**Por qué funcionan:**',
            '• Señalan a la piel para producir colágeno',
            '• Reparan barrera cutánea',
            '• Reducen inflamación',
            '• Mejoran firmeza',
            '**Tipos efectivos:**',
            '• Matrixyl (palmitoyl pentapeptide)',
            '• Argireline (acetyl hexapeptide)',
            '• Copper peptides',
            '**Cómo usarlos:**',
            '• AM y/o PM',
            '• Compatible con otros activos',
            '• En serum o crema',
            '• Usar consistentemente',
            '**Resultados:** 8-12 semanas para firmeza visible',
            '**RUTINA ANTI-EDAD COMPLETA:**',
            '**MAÑANA (Protección):**',
            '1. Limpiador suave',
            '2. Vitamina C serum',
            '3. Ácido hialurónico',
            '4. Contorno de ojos con peptidos',
            '5. Crema hidratante',
            '6. Protector solar SPF 50+',
            '**NOCHE (Reparación):**',
            '1. Limpiador doble',
            '2. Tónico hidratante',
            '3. Retinol (comenzar 2-3x semana)',
            '4. Ácido hialurónico',
            '5. Serum de peptidos',
            '6. Crema de noche rica',
            '7. Aceite facial (opcional)',
            '**POR EDADES:**',
            '**20s - PREVENCIÓN:**',
            '• Protector solar (obligatorio)',
            '• Antioxidantes (vitamina C)',
            '• Hidratación (ácido hialurónico)',
            '**30s - PRIMEROS SIGNOS:**',
            '• Todo lo anterior +',
            '• Retinol bajo (0.25-0.3%)',
            '• Peptidos',
            '• Contorno de ojos',
            '**40s - CORRECCIÓN:**',
            '• Retinol más alto (0.5-1%)',
            '• Peptidos múltiples',
            '• Tratamientos profesionales ocasionales',
            '• Considerar tretinoína recetada',
            '**50+ - MANTENIMIENTO:**',
            '• Retinoides recetados',
            '• Hidratación intensiva',
            '• Tratamientos dermatológicos',
            '• Suplementos de colágeno',
            '**MITOS COMUNES:**',
            '❌ "Es muy joven para anti-edad"',
            '✅ La prevención en los 20s es clave',
            '❌ "Más productos = mejores resultados"',
            '✅ Consistencia > Cantidad',
            '❌ "Los resultados son inmediatos"',
            '✅ Toma mínimo 8-12 semanas',
            '❌ "Las cremas caras son mejores"',
            '✅ Los ingredientes importan, no el precio',
            '**COMPLEMENTOS IMPORTANTES:**',
            '• Dieta rica en antioxidantes',
            '• Hidratación (2-3L agua diaria)',
            '• Sueño de calidad (7-8 horas)',
            '• Manejo de estrés',
            '• No fumar',
            '• Limitar alcohol',
            '• Ejercicio regular',
            'Recuerda: El envejecimiento es natural y hermoso. Estos productos ayudan a que tu piel esté saludable y radiante a cualquier edad.'
        ]
    }
];

function ProductImageCarousel({ images }: { images: string[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const imagesToShow = images && images.length > 0 ? images : ['https://via.placeholder.com/400x400?text=AuraDerm'];

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % imagesToShow.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + imagesToShow.length) % imagesToShow.length);
    };

    const goToImage = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex(index);
    };

    if (imagesToShow.length === 1) {
        return <img src={imagesToShow[0]} alt="Producto" className="w-full h-full object-cover transform group-hover:scale-110 transition duration-700 ease-in-out" />;
    }

    return (
        <div className="relative w-full h-full">
            <img
                src={imagesToShow[currentIndex]}
                alt={`Producto ${currentIndex + 1}`}
                className="w-full h-full object-cover transition-opacity duration-300"
            />

            {/* Botones de navegación */}
            {imagesToShow.length > 1 && (
                <>
                    <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-10"
                    >
                        <i className="fas fa-chevron-left text-gray-800"></i>
                    </button>
                    <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-10"
                    >
                        <i className="fas fa-chevron-right text-gray-800"></i>
                    </button>

                    {/* Indicadores (dots) */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                        {imagesToShow.map((_, index) => (
                            <button
                                key={index}
                                onClick={(e) => goToImage(index, e)}
                                className={`w-2 h-2 rounded-full transition-all ${
                                    index === currentIndex
                                        ? 'bg-[#FF6B9D] w-6'
                                        : 'bg-white/70 hover:bg-white'
                                }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function ArticleModal({ article, onClose }: { article: Article; onClose: () => void }) {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const renderContent = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-3xl max-w-4xl w-full my-8 shadow-2xl animate-[fadeIn_0.3s_ease-out] relative" onClick={(e) => e.stopPropagation()}>

                {/* Header Image */}
                <div className="relative h-72 overflow-hidden rounded-t-3xl">
                    <img src={article.image} alt={article.title} className="w-full h-full object-cover"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

                    <div className="absolute bottom-6 left-6 right-6">
                        <span className="inline-block px-4 py-1.5 bg-[#FF6B9D] text-white text-xs font-bold rounded-full mb-3 shadow-lg">{article.category}</span>
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-3 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">{article.title}</h2>
                        <div className="flex flex-wrap items-center gap-4 text-white/95 text-sm">
                            <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                                <i className="fas fa-user-circle"></i>{article.author}
                            </span>
                            <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                                <i className="fas fa-calendar"></i>{article.date}
                            </span>
                            <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                                <i className="fas fa-clock"></i>{article.readTime} lectura
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 md:p-12 max-h-[600px] overflow-y-auto scrollbar-hide bg-gradient-to-b from-white to-pink-50/30 relative">
                    {/* BOTÓN DE CERRAR FIJO ARRIBA A LA DERECHA */}
                    <button
                        onClick={onClose}
                        className="sticky top-0 float-right ml-4 mb-4 w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-2xl hover:shadow-[0_0_30px_rgba(239,68,68,0.8)] hover:scale-110 z-50 transition-all animate-pulse hover:animate-none"
                        aria-label="Cerrar"
                        title="CERRAR"
                    >
                        <i className="fas fa-times text-2xl font-black"></i>
                    </button>
                    {article.content.map((paragraph, idx) => {
                        if (paragraph.startsWith('**') && paragraph.endsWith('**') && !paragraph.includes(':')) {
                            return (
                                <div key={idx} className="mt-8 mb-6 first:mt-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-8 bg-gradient-to-b from-[#FF6B9D] to-[#C74375] rounded-full"></div>
                                        <h3 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">
                                            {paragraph.replace(/\*\*/g, '')}
                                        </h3>
                                    </div>
                                </div>
                            );
                        } else if (paragraph.startsWith('**') && paragraph.includes(':**')) {
                            const [title, ...rest] = paragraph.split(':**');
                            return (
                                <div key={idx} className="mb-4 bg-pink-50/50 p-4 rounded-2xl border-l-4 border-[#FF6B9D]">
                                    <h4 className="text-lg font-bold text-[#C74375] mb-2 flex items-center gap-2">
                                        <i className="fas fa-star text-[#FF6B9D] text-sm"></i>
                                        {title.replace(/\*\*/g, '')}
                                    </h4>
                                    {rest.length > 0 && (
                                        <p className="text-gray-700 leading-relaxed">{renderContent(rest.join(':**'))}</p>
                                    )}
                                </div>
                            );
                        } else if (paragraph.startsWith('•')) {
                            return (
                                <div key={idx} className="flex items-start gap-3 mb-3 ml-2">
                                    <span className="text-[#FF6B9D] mt-1 text-lg flex-shrink-0">●</span>
                                    <p className="text-gray-700 leading-relaxed flex-1">{renderContent(paragraph.substring(2))}</p>
                                </div>
                            );
                        } else if (paragraph.startsWith('❌')) {
                            return (
                                <div key={idx} className="flex items-start gap-3 mb-3 p-3 bg-red-50/50 rounded-xl border-l-4 border-red-400">
                                    <span className="text-2xl flex-shrink-0">❌</span>
                                    <p className="text-gray-700 leading-relaxed flex-1">{renderContent(paragraph.substring(2))}</p>
                                </div>
                            );
                        } else if (paragraph.startsWith('✅')) {
                            return (
                                <div key={idx} className="flex items-start gap-3 mb-3 p-3 bg-green-50/50 rounded-xl border-l-4 border-green-400">
                                    <span className="text-2xl flex-shrink-0">✅</span>
                                    <p className="text-gray-700 leading-relaxed flex-1">{renderContent(paragraph.substring(2))}</p>
                                </div>
                            );
                        } else if (paragraph.match(/^\d+\./)) {
                            const text = paragraph.replace(/^\d+\.\s*/, '');
                            const number = paragraph.match(/^(\d+)\./)?.[1];
                            return (
                                <div key={idx} className="flex items-start gap-3 mb-3 ml-2">
                                    <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-[#FF6B9D] to-[#C74375] text-white rounded-full flex items-center justify-center text-sm font-bold">
                                        {number}
                                    </span>
                                    <p className="text-gray-700 leading-relaxed flex-1 pt-0.5">{renderContent(text)}</p>
                                </div>
                            );
                        } else {
                            return (
                                <p key={idx} className="text-gray-700 leading-relaxed mb-4 text-base">
                                    {renderContent(paragraph)}
                                </p>
                            );
                        }
                    })}
                </div>

                {/* Footer */}
                <div className="border-t border-pink-100 p-6 bg-gradient-to-r from-pink-50 to-purple-50/30 rounded-b-3xl">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                            <p className="text-sm font-semibold text-gray-800 mb-1">
                                ¿Te gustó este artículo?
                            </p>
                            <p className="text-xs text-gray-600">
                                Compártelo con tus amigas
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button className="w-11 h-11 rounded-full bg-white hover:bg-[#1877F2] hover:text-white transition-all shadow-md hover:shadow-lg hover:scale-110 flex items-center justify-center group">
                                <i className="fab fa-facebook-f group-hover:scale-110 transition-transform"></i>
                            </button>
                            <button className="w-11 h-11 rounded-full bg-white hover:bg-[#1DA1F2] hover:text-white transition-all shadow-md hover:shadow-lg hover:scale-110 flex items-center justify-center group">
                                <i className="fab fa-twitter group-hover:scale-110 transition-transform"></i>
                            </button>
                            <button className="w-11 h-11 rounded-full bg-white hover:bg-[#25D366] hover:text-white transition-all shadow-md hover:shadow-lg hover:scale-110 flex items-center justify-center group">
                                <i className="fab fa-whatsapp group-hover:scale-110 transition-transform"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BlogGrid({ onArticleClick }: { onArticleClick: (article: Article) => void }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BLOG_ARTICLES.map((article) => (
                <div
                    key={article.id}
                    className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition duration-300 group cursor-pointer"
                    onClick={() => onArticleClick(article)}
                >
                    <div className="h-48 overflow-hidden">
                        <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500"/>
                    </div>
                    <div className="p-6">
                        <span className="text-xs font-bold text-[#FF6B9D] bg-pink-50 px-2 py-1 rounded-md">{article.category}</span>
                        <h3 className="font-bold text-lg mt-3 mb-2 group-hover:text-[#C74375] transition">{article.title}</h3>
                        <p className="text-gray-500 text-sm line-clamp-3 mb-4">{article.excerpt}</p>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <span><i className="fas fa-clock mr-1"></i>{article.readTime}</span>
                            <span className="text-[#C74375] font-bold group-hover:underline">Leer más →</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function CommunitySection() {
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [showAllArticles, setShowAllArticles] = useState(false);

    const displayArticles = showAllArticles ? BLOG_ARTICLES : BLOG_ARTICLES.slice(0, 2);

    return (
        <>
            <section id="community" className="py-24 bg-[#fff0f5] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full opacity-10" style={{backgroundImage: 'radial-gradient(#FF6B9D 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
                        <div>
                            <span className="text-[#FF6B9D] font-bold text-xs uppercase tracking-widest">Blog & Tips</span>
                            <h2 className="text-4xl font-serif font-bold text-gray-900 mt-2">Comunidad AuraDerm</h2>
                        </div>
                        <button
                            onClick={() => setShowAllArticles(!showAllArticles)}
                            className="text-[#C74375] font-bold hover:underline flex items-center gap-2 transition"
                        >
                            {showAllArticles ? 'Ver menos' : 'Ver todos los artículos'}
                            <i className={`fas fa-arrow-${showAllArticles ? 'up' : 'right'}`}></i>
                        </button>
                    </div>

                    {showAllArticles ? (
                        <BlogGrid onArticleClick={setSelectedArticle} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {displayArticles.map((article) => (
                                <div
                                    key={article.id}
                                    className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition duration-300 group cursor-pointer"
                                    onClick={() => setSelectedArticle(article)}
                                >
                                    <div className="h-48 overflow-hidden">
                                        <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500"/>
                                    </div>
                                    <div className="p-6">
                                        <span className="text-xs font-bold text-[#FF6B9D] bg-pink-50 px-2 py-1 rounded-md">{article.category}</span>
                                        <h3 className="font-bold text-lg mt-3 mb-2 group-hover:text-[#C74375] transition">{article.title}</h3>
                                        <p className="text-gray-500 text-sm line-clamp-3">{article.excerpt}</p>
                                        <button className="mt-4 text-sm font-bold text-gray-800 underline hover:text-[#C74375] transition">Leer más</button>
                                    </div>
                                </div>
                            ))}

                            {/* Testimonial */}
                            <div className="bg-[#FF6B9D] rounded-3xl p-8 text-white flex flex-col justify-center relative overflow-hidden">
                                <i className="fas fa-quote-left text-4xl text-white/30 mb-4"></i>
                                <p className="text-lg font-medium italic relative z-10">"Nunca pensé que mi piel pudiera verse tan luminosa sin maquillaje. AuraDerm cambió mi confianza por completo."</p>
                                <div className="mt-6 flex items-center gap-3">
                                    <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="User" className="w-10 h-10 rounded-full border-2 border-white"/>
                                    <div>
                                        <p className="font-bold text-sm">Valentina R.</p>
                                        <p className="text-xs text-pink-100">Cliente Verificada</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {selectedArticle && (
                <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
            )}
        </>
    );
}

function Footer({ logoUrl }: { logoUrl: string | null }) {
    return (
        <footer id="contact" className="bg-gray-900 text-gray-300 pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center gap-2 mb-6">
                             {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-full"/>
                             ) : <i className="fas fa-leaf text-2xl text-[#FF6B9D]"></i>}
                             <span className="text-2xl font-bold text-white font-serif">Aura<span className="text-[#FF6B9D]">Derm</span></span>
                        </div>
                        <p className="text-sm leading-relaxed mb-6 text-gray-400">
                            Dedicados a resaltar tu belleza natural con productos dermatológicos de alta calidad. Tu piel merece lo mejor.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#FF6B9D] hover:text-white transition"><i className="fab fa-instagram"></i></a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#FF6B9D] hover:text-white transition"><i className="fab fa-tiktok"></i></a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#FF6B9D] hover:text-white transition"><i className="fab fa-facebook-f"></i></a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Enlaces Rápidos</h4>
                        <ul className="space-y-3 text-sm">
                            <li><a href="#products" className="hover:text-[#FF6B9D] transition">Colección</a></li>
                            <li><a href="#how-it-works" className="hover:text-[#FF6B9D] transition">Cómo Comprar</a></li>
                            <li><a href="#community" className="hover:text-[#FF6B9D] transition">Blog de Belleza</a></li>
                            <li><a href="#" className="hover:text-[#FF6B9D] transition">Preguntas Frecuentes</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Contáctanos</h4>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-start gap-3">
                                <i className="fas fa-map-marker-alt mt-1 text-[#FF6B9D]"></i>
                                <span>Envíos a toda Colombia</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <i className="fas fa-phone text-[#FF6B9D]"></i>
                                <span>+57 301 772 7626</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <i className="fas fa-envelope text-[#FF6B9D]"></i>
                                <span>hola@auraderm.com</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <i className="fas fa-clock text-[#FF6B9D]"></i>
                                <span>Lun - Sab: 9:00 AM - 6:00 PM</span>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Únete al Club</h4>
                        <p className="text-sm text-gray-400 mb-4">Recibe tips de skincare y ofertas exclusivas.</p>
                        <form className="flex flex-col gap-3">
                            <input 
                                type="email" 
                                placeholder="Tu correo electrónico" 
                                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF6B9D]"
                            />
                            <button className="bg-[#FF6B9D] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#C74375] transition">
                                Suscribirme
                            </button>
                        </form>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-gray-500">© 2025 AuraDerm Skincare. Todos los derechos reservados.</p>
                    <div className="flex gap-6 text-xs text-gray-500">
                        <a href="#" className="hover:text-white">Políticas de Privacidad</a>
                        <a href="#" className="hover:text-white">Términos y Condiciones</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

// --- Cart Component ---

function CartSidebar({ 
  isOpen, 
  onClose, 
  items, 
  updateQuantity, 
  removeItem, 
  total,
  openCheckout 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  items: CartItem[], 
  updateQuantity: (id: string, delta: number) => void,
  removeItem: (id: string) => void,
  total: number,
  openCheckout: () => void
}) {
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-white z-50 shadow-2xl transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-6 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-xl font-serif font-bold text-gray-800">Tu Carrito</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <i className="fas fa-shopping-basket text-4xl mb-4 text-pink-200"></i>
              <p>Tu carrito está vacío</p>
              <button onClick={onClose} className="mt-4 text-[#FF6B9D] font-medium hover:underline">
                Ir a comprar
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map(item => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                    <img src={item.imagenUrl} alt={item.nombre} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 line-clamp-1">{item.nombre}</h3>
                    <p className="text-[#C74375] font-semibold text-sm">{formatPrice(item.precio)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-gray-200 rounded-lg">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50">-</button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50">+</button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition">
                        <i className="fas fa-trash-alt text-sm"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {items.length > 0 && (
          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600">Total</span>
              <span className="text-2xl font-bold text-gray-900">{formatPrice(total)}</span>
            </div>
            <button 
              onClick={openCheckout}
              className="w-full bg-[#FF6B9D] text-white py-4 rounded-xl font-bold hover:bg-[#C74375] transition shadow-lg shadow-pink-200 flex items-center justify-center gap-2"
            >
              <span>Confirmar Pedido</span>
              <i className="fas fa-arrow-right"></i>
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              <i className="fas fa-lock mr-1"></i> Pago seguro contraentrega
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// --- Checkout Modal ---

function CheckoutModal({ isOpen, onClose, total, onSubmit }: { isOpen: boolean, onClose: () => void, total: number, onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({ name: '', city: '', phone: '', address: '' });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-float">
        <div className="bg-gradient-aura p-6 text-center">
          <h3 className="text-2xl font-serif font-bold text-gray-800">Finalizar Compra</h3>
          <p className="text-sm text-gray-600 mt-1">Completa tus datos para enviar el pedido</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
            <input 
              required
              type="text" 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D] transition"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Ej: María Pérez"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ciudad</label>
            <input 
              required
              type="text" 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D] transition"
              value={formData.city}
              onChange={e => setFormData({...formData, city: e.target.value})}
              placeholder="Ej: Bogotá, Medellín..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección (Opcional)</label>
            <input 
              type="text" 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D] transition"
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              placeholder="Calle 123 # 45-67"
            />
          </div>
          
          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-green-500 text-white py-4 rounded-xl font-bold hover:bg-green-600 transition shadow-lg flex items-center justify-center gap-2"
            >
              <i className="fab fa-whatsapp text-xl"></i>
              <span>Enviar Pedido por WhatsApp</span>
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              Serás redirigido a WhatsApp para confirmar
            </p>
          </div>
        </form>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
}

// --- Chatbot ---

interface Message {
  role: "user" | "model";
  text: string;
  type?: "text" | "order_link";
  link?: string;
}

function Chatbot({ products }: { products: Product[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "¡Hola hermosa! 🌸 Soy tu asesora de AuraDerm. ¿Buscas una rutina para tu piel o quieres hacer un pedido?" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSession = useRef<any>(null);

  const toggleChat = () => setIsOpen(!isOpen);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const getSystemInstruction = () => {
    const productList = products.map(p => `- ${p.nombre}: ${p.descripcion} Precio: ${formatPrice(p.precio)}`).join('\n');
    
    return `
      Eres la asistente virtual experta de "AuraDerm". Tu tono es muy amiga, femenino y profesional.
      
      IMPORTANTE:
      - Usa párrafos cortos.
      - Usa emojis (🌸, ✨).
      - Si das una lista, usa guiones.
      
      Tus objetivos:
      1. Asesorar sobre rutinas de skincare usando SÓLO los productos del catálogo.
      2. Ayudar a concretar ventas.
      3. Recordar que el pago es CONTRAENTREGA.

      Catálogo de Productos:
      ${productList}

      Reglas:
      - Para tomar un pedido, pide nombre y ciudad.
      - Usa la herramienta 'createOrder' cuando tengas los datos.
      - NO inventes productos.
    `;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText;
    setInputText("");
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      if (!chatSession.current) {
        chatSession.current = ai.chats.create({
          model: "gemini-3-flash-preview",
          config: {
            systemInstruction: getSystemInstruction(),
            tools: [{ functionDeclarations: [createOrderTool] }],
          },
        });
      }

      const result = await chatSession.current.sendMessage({ message: userMessage });
      const functionCalls = result.functionCalls;
      
      let responseText = result.text || "";

      if (functionCalls && functionCalls.length > 0) {
        const functionResponses = [];
        
        for (const call of functionCalls) {
          if (call.name === "createOrder") {
            const args = call.args as any;
            
            const matchedItems: CartItem[] = [];
            let total = 0;

            if (args.productNames) {
              args.productNames.forEach((name: string) => {
                const product = products.find(p => p.nombre.toLowerCase().includes(name.toLowerCase()));
                if (product) {
                  matchedItems.push({
                    ...product,
                    precio: parsePrice(product.precio),
                    quantity: 1
                  });
                  total += parsePrice(product.precio);
                }
              });
            }

            const link = generateWhatsAppLink(matchedItems, total, { name: args.customerName, city: args.customerCity });
            
            functionResponses.push({
              id: call.id,
              name: call.name,
              response: { result: "success", link: link }
            });

            setMessages(prev => [...prev, { 
              role: "model", 
              text: `¡Listo! He preparado tu pedido para ${args.customerName}. Haz clic abajo para confirmar en WhatsApp. ✨`,
              type: "order_link",
              link: link
            }]);
            
            setIsLoading(false);
            return;
          }
        }
        
        const toolResult = await chatSession.current.sendMessage({ message: functionResponses });
        responseText = toolResult.text;
      }

      if (responseText) {
        setMessages(prev => [...prev, { role: "model", text: responseText }]);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "model", text: "Ups, tuve un pequeño problema técnico. 💆‍♀️ ¿Me lo repites?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 z-40 p-0 w-16 h-16 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center ${isOpen ? 'bg-gray-800 rotate-90' : 'bg-[#FF6B9D]'}`}
      >
        {isOpen ? 
          <i className="fas fa-times text-white text-xl"></i> : 
          <div className="relative">
            <i className="fas fa-comment-medical text-white text-2xl"></i>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
          </div>
        }
      </button>

      <div 
        className={`fixed bottom-24 right-6 w-80 sm:w-96 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl z-40 flex flex-col transition-all duration-300 origin-bottom-right border border-pink-100 overflow-hidden ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
        style={{ height: '500px', maxHeight: '70vh' }}
      >
        <div className="bg-gradient-to-r from-[#FF6B9D] to-[#C74375] p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white">
            <i className="fas fa-robot"></i>
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">AuraDerm AI</h3>
            <p className="text-pink-100 text-xs">Experta en piel ✨</p>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 scrollbar-hide">
          {messages.map((msg, idx) => (
            <div key={idx} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-[#FF6B9D] text-white rounded-br-none' 
                  : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none'
              }`}>
                {msg.text}
                {msg.type === "order_link" && msg.link && (
                  <a 
                    href={msg.link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="mt-3 block bg-green-500 text-white text-center py-2 rounded-lg font-bold hover:bg-green-600 transition flex items-center justify-center gap-2"
                  >
                    <i className="fab fa-whatsapp"></i> Enviar Pedido
                  </a>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex justify-start mb-4">
               <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-bl-none shadow-sm flex space-x-1">
                 <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
                 <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
                 <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100">
          <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-pink-200 transition-all">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Pregunta sobre rutinas..."
              className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-800 placeholder-gray-400"
            />
            <button 
              type="submit" 
              disabled={isLoading || !inputText.trim()}
              className="ml-2 text-[#FF6B9D] hover:text-[#C74375] disabled:text-gray-300 transition"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// --- Main App ---

function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Generate Logo with AI
  useEffect(() => {
      const generateLogo = async () => {
          try {
              const result = await ai.models.generateContent({
                  model: 'gemini-2.5-flash-image',
                  contents: {
                      parts: [
                          { text: "Minimalist, elegant vector logo for a skincare brand called 'AuraDerm'. The design should feature a delicate rose or lotus flower in soft pink (#FF6B9D) and white colors. High quality, professional logo design on a white background." }
                      ]
                  },
                  config: {
                      imageConfig: { aspectRatio: "1:1" }
                  }
              });

              for (const part of result.candidates[0].content.parts) {
                if (part.inlineData) {
                    setLogoUrl(`data:image/png;base64,${part.inlineData.data}`);
                    break;
                }
              }
          } catch (e) {
              console.error("Failed to generate logo", e);
          }
      };
      generateLogo();
  }, []);

  // Fetch Products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "productos"));
        const fetchedProducts: Product[] = [];
        querySnapshot.forEach((doc) => {
          fetchedProducts.push({ id: doc.id, ...doc.data() } as Product);
        });
        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Error fetching products from Firebase:", error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('auraderm-cart');
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (e) {
        console.error("Cart error", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('auraderm-cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, precio: parsePrice(product.precio), quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + (item.precio * item.quantity), 0), [cart]);

  const handleCheckoutSubmit = (customerData: any) => {
    const link = generateWhatsAppLink(cart, cartTotal, customerData);
    window.open(link, '_blank');
    setCart([]); 
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header 
        cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} 
        onOpenCart={() => setIsCartOpen(true)} 
        logoUrl={logoUrl}
      />
      <Hero />
      <HowItWorks />
      <ProductGrid 
        products={products} 
        loading={loadingProducts}
        addToCart={addToCart}
        onProductClick={setSelectedProduct}
      />
      <Benefits />
      <CommunitySection />
      
      {/* WhatsApp Float Button */}
      <a 
        href={`https://wa.me/${WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 left-6 z-40 bg-green-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition hover:-translate-y-1 animate-float"
      >
        <i className="fab fa-whatsapp text-3xl"></i>
      </a>

      <CartSidebar 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        items={cart}
        updateQuantity={updateQuantity}
        removeItem={removeItem}
        total={cartTotal}
        openCheckout={() => setIsCheckoutOpen(true)}
      />

      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        total={cartTotal}
        onSubmit={handleCheckoutSubmit}
      />

      <ProductModal 
        product={selectedProduct} 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        addToCart={addToCart}
      />
      
      <Chatbot products={products} />
      
      <Footer logoUrl={logoUrl} />
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
