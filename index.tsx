import React, { useState, useRef, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

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

  message += `📦 *Costo de envío:* Se confirma según tu ubicación ($10.000 - $50.000 aprox), este valor SE SUMA al total.\n\n`;
  message += `¡Gracias por tu compra! 💖`;

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};

// --- Gemini AI Setup ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const createOrderTool: FunctionDeclaration = {
  name: "createOrder",
  parameters: {
    type: Type.OBJECT,
    description: "Generar un enlace de pedido de WhatsApp para el cliente con los productos del carrito.",
    properties: {
      customerName: {
        type: Type.STRING,
        description: "Nombre del cliente."
      },
      customerCity: {
        type: Type.STRING,
        description: "Ciudad del cliente."
      }
    },
    required: ["customerName", "customerCity"]
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
              <i className="fas fa-star text-[#FF6B9D]"></i> Selección Premium
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold text-gray-900 mb-6 font-serif leading-[1.1]">
              Tu Piel Cuenta <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B9D] to-[#ff8da1]">Una Historia</span>
            </h1>
            <p className="text-lg text-gray-600 mb-10 max-w-lg mx-auto lg:mx-0 font-light leading-relaxed">
              Únete a nuestra comunidad de mujeres que eligen lo mejor. Seleccionamos cuidadosamente productos virales y efectivos para resaltar tu belleza.
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
                  <p className="font-bold text-gray-800">Envíos Seguros</p>
                  <p className="text-xs text-gray-500">A todo el país</p>
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

  const [activeTab, setActiveTab] = useState<'details' | 'benefits'>('details');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden relative z-10 animate-fade-in-up flex flex-col md:flex-row max-h-[90vh] md:h-[650px]">
        {/* Botón de cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all hover:bg-white shadow-sm"
        >
          <i className="fas fa-times text-lg"></i>
        </button>

        {/* Image Side */}
        <div className="w-full md:w-1/2 h-64 md:h-full bg-gray-50 relative group">
          <ProductImageCarousel images={product.imagenesUrls || [product.imagenUrl]} />

          {/* Tags sobre la imagen */}
          <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
            {product.categoria && (
              <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-900 shadow-sm uppercase tracking-wide">
                {product.categoria}
              </span>
            )}
            {product.stock === 0 && (
              <span className="bg-gray-900 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm uppercase tracking-wide">
                Agotado
              </span>
            )}
            {product.stock > 0 && (
              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm uppercase tracking-wide">
                Disponible
              </span>
            )}
          </div>
        </div>

        {/* Details Side */}
        <div className="w-full md:w-1/2 flex flex-col bg-white">
          {/* Header Section */}
          <div className="p-8 pb-0">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 leading-tight">{product.nombre}</h2>
            </div>

            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-3xl font-bold text-[#FF6B9D]">{formatPrice(product.precio)}</span>
              <span className="text-sm text-gray-400 font-medium line-through">{formatPrice(Number(parsePrice(product.precio)) * 1.2)}</span>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-8 border-b border-gray-100 mb-6">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === 'details'
                  ? 'text-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                Detalles
                {activeTab === 'details' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('benefits')}
                className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === 'benefits'
                  ? 'text-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                Beneficios
                {activeTab === 'benefits' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></div>
                )}
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-8 custom-scrollbar">
            {activeTab === 'details' ? (
              <div className="space-y-8 animate-fade-in">
                <p className="text-gray-600 leading-relaxed text-base font-light whitespace-pre-line">
                  {product.descripcion}
                </p>

                {/* Trust Badges Grid */}
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-pink-50/50">
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-[#FF6B9D]">
                      <i className="fas fa-truck text-xs"></i>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Envío Rápido</p>
                      <p className="text-[10px] text-gray-500">2-4 días hábiles</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50/50">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <i className="fas fa-leaf text-xs"></i>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Natural</p>
                      <p className="text-[10px] text-gray-500">Ingredientes seguros</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <i className="fas fa-shield-alt text-xs"></i>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Garantía</p>
                      <p className="text-[10px] text-gray-500">De satisfacción</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50/50">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                      <i className="fas fa-money-bill-wave text-xs"></i>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Contraentrega</p>
                      <p className="text-[10px] text-gray-500">Paga al recibir</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in pb-4">
                {(Array.isArray(product.beneficios) ? product.beneficios : [product.beneficios]).filter(Boolean).length > 0 ? (
                  (Array.isArray(product.beneficios) ? product.beneficios : [product.beneficios]).map((b: any, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100/50 hover:bg-white hover:shadow-md transition-all duration-300">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FF6B9D] to-[#ff8da1] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm text-white text-xs">
                        <i className="fas fa-check"></i>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed font-medium">{b}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-gray-400">
                    <p>No hay beneficios detallados disponibles.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-6 border-t border-gray-100 bg-white/50 backdrop-blur-sm">
            <button
              onClick={() => { addToCart(product); onClose(); }}
              disabled={product.stock === 0}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all transform active:scale-95 text-lg shadow-xl ${product.stock === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#FF6B9D] to-[#C74375] text-white hover:shadow-2xl hover:translate-y-[-2px] hover:shadow-pink-200'
                }`}
            >
              <span className="text-xl"><i className="fas fa-shopping-bag"></i></span>
              {product.stock === 0 ? 'Producto Agotado' : '¡Lo Quiero Ahora!'}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3 font-medium">
              <i className="fas fa-lock mr-1"></i> Compra 100% segura y protegida
            </p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <div key={product.id} className="group bg-gradient-to-br from-white to-pink-50/30 rounded-[2rem] overflow-hidden hover:shadow-[0_20px_60px_rgba(255,107,157,0.15)] transition-all duration-500 border-2 border-pink-100/50 hover:border-pink-200 flex flex-col h-full relative">
                {/* Badge de categoría flotante */}
                {product.categoria && (
                  <div className="absolute top-4 left-4 z-30 bg-gradient-to-r from-[#FF6B9D] to-[#C74375] text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    ✨ {product.categoria}
                  </div>
                )}

                <div
                  className="relative h-80 overflow-hidden bg-gradient-to-br from-pink-50 to-white cursor-pointer group-hover:scale-[1.02] transition-transform duration-500"
                  onClick={() => onProductClick(product)}
                >
                  <ProductImageCarousel images={product.imagenesUrls || [product.imagenUrl]} />

                  {/* Overlay con degradado sutil */}
                  <div className="absolute inset-0 bg-gradient-to-t from-pink-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Botón Ver Detalles mejorado */}
                  <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-all duration-300 z-20">
                    <button
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); onProductClick(product); }}
                      className="w-full bg-gradient-to-r from-[#FF6B9D] to-[#C74375] text-white font-bold py-3.5 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-sparkles"></i> Ver Detalles
                    </button>
                  </div>

                  {/* Etiqueta de agotado */}
                  {product.stock === 0 && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                      <span className="bg-gray-900/90 backdrop-blur text-white px-6 py-3 rounded-full font-bold text-sm shadow-xl">
                        AGOTADO
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-1 bg-white/80 backdrop-blur-sm">
                  <div className="flex justify-between items-start mb-3">
                    <h3
                      className="text-xl font-bold text-gray-900 font-serif cursor-pointer hover:text-[#FF6B9D] transition leading-tight"
                      onClick={() => onProductClick(product)}
                    >
                      {product.nombre}
                    </h3>
                  </div>

                  {/* Clean card: removed description and benefits */}

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-pink-100">
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold bg-gradient-to-r from-[#FF6B9D] to-[#C74375] bg-clip-text text-transparent">
                        {formatPrice(product.precio)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">Envío gratis +$50.000</span>
                    </div>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                      className={`group/btn w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-xl ${product.stock === 0
                        ? 'bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-br from-[#FF6B9D] to-[#C74375] text-white hover:scale-110 hover:rotate-6'
                        }`}
                      title={product.stock === 0 ? "Agotado" : "Agregar al carrito"}
                    >
                      <i className={`fas ${product.stock === 0 ? 'fa-times' : 'fa-shopping-bag'} group-hover/btn:scale-110 transition-transform`}></i>
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
  titulo: string;
  categoria: string;
  autor: string;
  fechaPublicacion: string;
  tiempoLectura: number;
  introduccion: string;
  imagenPrincipalUrl: string;
  secciones?: { titulo: string; contenido: string }[];
  tips?: string[];
  bibliografia?: { titulo: string; autor: string; url: string }[];
  publicado?: boolean;
}

interface Testimonial {
  id: string;
  nombreCliente: string;
  calificacion: number; // 1-5 estrellas
  testimonioTexto: string;
  fotoUrl?: string;
  productoRelacionado?: string;
  fechaTestimonio: string;
  destacado?: boolean;
  verificado?: boolean;
}

// Los artículos y testimonios se cargan desde Firebase
// Ya no hay contenido hardcodeado

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
                className={`w-2 h-2 rounded-full transition-all ${index === currentIndex
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-4xl w-full my-8 shadow-2xl animate-[fadeIn_0.3s_ease-out] relative" onClick={(e) => e.stopPropagation()}>

        {/* Header Image */}
        <div className="relative h-72 overflow-hidden rounded-t-3xl">
          <img src={article.imagenPrincipalUrl} alt={article.titulo} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

          <div className="absolute bottom-6 left-6 right-6">
            <span className="inline-block px-4 py-1.5 bg-[#FF6B9D] text-white text-xs font-bold rounded-full mb-3 shadow-lg">{article.categoria}</span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-3 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">{article.titulo}</h2>
            <div className="flex flex-wrap items-center gap-4 text-white/95 text-sm">
              <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                <i className="fas fa-user-circle"></i>{article.autor}
              </span>
              <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                <i className="fas fa-calendar"></i>{article.fechaPublicacion}
              </span>
              <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                <i className="fas fa-clock"></i>{article.tiempoLectura} min lectura
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

          {/* Introducción */}
          <p className="text-lg text-gray-700 leading-relaxed mb-8">{article.introduccion}</p>

          {/* Secciones */}
          {article.secciones && article.secciones.map((seccion, idx) => (
            <div key={idx} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-8 bg-gradient-to-b from-[#FF6B9D] to-[#C74375] rounded-full"></div>
                <h3 className="text-2xl font-serif font-bold text-gray-900">{seccion.titulo}</h3>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{seccion.contenido}</p>
            </div>
          ))}

          {/* Tips */}
          {article.tips && article.tips.length > 0 && (
            <div className="mt-8 p-6 bg-gradient-to-br from-pink-50 to-white rounded-2xl border-2 border-pink-100">
              <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i className="fas fa-lightbulb text-[#FF6B9D]"></i> Tips Rápidos
              </h4>
              <ul className="space-y-2">
                {article.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-700">
                    <i className="fas fa-check text-[#FF6B9D] mt-1"></i>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bibliografía */}
          {article.bibliografia && article.bibliografia.length > 0 && (
            <div className="mt-8 p-6 bg-gray-50 rounded-2xl">
              <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i className="fas fa-book text-[#FF6B9D]"></i> Referencias
              </h4>
              <ul className="space-y-3">
                {article.bibliografia.map((fuente, idx) => (
                  <li key={idx} className="text-sm text-gray-700">
                    <strong>{fuente.titulo}</strong>
                    {fuente.autor && <span> - {fuente.autor}</span>}
                    {fuente.url && (
                      <a href={fuente.url} target="_blank" rel="noopener noreferrer" className="text-[#FF6B9D] hover:underline ml-2">
                        <i className="fas fa-external-link-alt text-xs"></i> Ver fuente
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BlogGrid({ articles, onArticleClick }: { articles: Article[]; onArticleClick: (article: Article) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {articles.map((article) => (
        <div
          key={article.id}
          className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition duration-300 group cursor-pointer"
          onClick={() => onArticleClick(article)}
        >
          <div className="h-48 overflow-hidden">
            <img src={article.imagenPrincipalUrl} alt={article.titulo} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
          </div>
          <div className="p-6">
            <span className="text-xs font-bold text-[#FF6B9D] bg-pink-50 px-2 py-1 rounded-md">{article.categoria}</span>
            <h3 className="font-bold text-lg mt-3 mb-2 group-hover:text-[#C74375] transition">{article.titulo}</h3>
            <p className="text-gray-500 text-sm line-clamp-3 mb-4">{article.introduccion}</p>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span><i className="fas fa-clock mr-1"></i>{article.tiempoLectura} min</span>
              <span className="text-[#C74375] font-bold group-hover:underline">Leer más →</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CommunitySection({ articles, loading, testimonials }: { articles: Article[]; loading: boolean; testimonials: Testimonial[] }) {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showAllArticles, setShowAllArticles] = useState(false);

  const displayArticles = showAllArticles ? articles : articles.slice(0, 2);
  const displayTestimonial = testimonials.length > 0 ? testimonials[0] : null;

  return (
    <>
      <section id="community" className="py-24 bg-[#fff0f5] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(#FF6B9D 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div>
              <span className="text-[#FF6B9D] font-bold text-xs uppercase tracking-widest">Blog & Tips</span>
              <h2 className="text-4xl font-serif font-bold text-gray-900 mt-2">Comunidad AuraDerm</h2>
            </div>
            {articles.length > 2 && (
              <button
                onClick={() => setShowAllArticles(!showAllArticles)}
                className="text-[#C74375] font-bold hover:underline flex items-center gap-2 transition"
              >
                {showAllArticles ? 'Ver menos' : 'Ver todos los artículos'}
                <i className={`fas fa-arrow-${showAllArticles ? 'up' : 'right'}`}></i>
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B9D] border-t-transparent mb-4"></div>
              <p className="text-gray-500">Cargando artículos...</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-16">
              <i className="fas fa-newspaper text-6xl text-gray-300 mb-4"></i>
              <h3 className="text-2xl font-serif font-bold text-gray-400 mb-2">Próximamente</h3>
              <p className="text-gray-500">Estamos preparando contenido exclusivo para ti</p>
            </div>
          ) : showAllArticles ? (
            <BlogGrid articles={articles} onArticleClick={setSelectedArticle} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {displayArticles.map((article) => (
                <div
                  key={article.id}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition duration-300 group cursor-pointer"
                  onClick={() => setSelectedArticle(article)}
                >
                  <div className="h-48 overflow-hidden">
                    <img src={article.imagenPrincipalUrl} alt={article.titulo} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  </div>
                  <div className="p-6">
                    <span className="text-xs font-bold text-[#FF6B9D] bg-pink-50 px-2 py-1 rounded-md">{article.categoria}</span>
                    <h3 className="font-bold text-lg mt-3 mb-2 group-hover:text-[#C74375] transition">{article.titulo}</h3>
                    <p className="text-gray-500 text-sm line-clamp-3">{article.introduccion}</p>
                    <button className="mt-4 text-sm font-bold text-gray-800 underline hover:text-[#C74375] transition">Leer más</button>
                  </div>
                </div>
              ))}

              {/* Testimonial desde Firebase */}
              {displayTestimonial && (
                <div className={`rounded-3xl p-8 text-white flex flex-col justify-center relative overflow-hidden ${displayTestimonial.destacado ? 'bg-gradient-to-br from-[#FF6B9D] to-[#C74375] border-2 border-yellow-400' : 'bg-[#FF6B9D]'}`}>
                  <i className="fas fa-quote-left text-4xl text-white/30 mb-4"></i>
                  <p className="text-lg font-medium italic relative z-10">"{displayTestimonial.testimonioTexto}"</p>

                  {/* Estrellas de calificación */}
                  <div className="flex gap-1 my-3">
                    {[...Array(5)].map((_, i) => (
                      <i key={i} className={`fas fa-star ${i < displayTestimonial.calificacion ? 'text-yellow-300' : 'text-white/30'}`}></i>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    {displayTestimonial.fotoUrl ? (
                      <img src={displayTestimonial.fotoUrl} alt={displayTestimonial.nombreCliente} className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full border-2 border-white bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                        {displayTestimonial.nombreCliente.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm">{displayTestimonial.nombreCliente}</p>
                      {displayTestimonial.verificado && (
                        <p className="text-xs text-pink-100 flex items-center gap-1">
                          <i className="fas fa-check-circle"></i> Cliente Verificada
                        </p>
                      )}
                      {displayTestimonial.productoRelacionado && (
                        <p className="text-xs text-white/80 mt-1">Producto: {displayTestimonial.productoRelacionado}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubscribeStatus("loading");

    try {
      await addDoc(collection(db, "comunidad"), {
        email: email.trim(),
        fechaSuscripcion: serverTimestamp(),
        tipo: "newsletter"
      });

      setSubscribeStatus("success");
      setEmail("");
      setTimeout(() => setSubscribeStatus("idle"), 3000);
    } catch (error) {
      console.error("Error al suscribir:", error);
      setSubscribeStatus("error");
      setTimeout(() => setSubscribeStatus("idle"), 3000);
    }
  };

  return (
    <footer id="contact" className="bg-gray-900 text-gray-300 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-full" />
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
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Tu correo electrónico"
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF6B9D]"
              />
              <button
                type="submit"
                disabled={subscribeStatus === "loading"}
                className="bg-[#FF6B9D] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#C74375] transition disabled:opacity-50"
              >
                {subscribeStatus === "loading" ? "Suscribiendo..." :
                  subscribeStatus === "success" ? "✓ Suscrito!" : "Suscribirme"}
              </button>
              {subscribeStatus === "error" && (
                <p className="text-red-400 text-xs">Error al suscribir. Intenta de nuevo.</p>
              )}
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

// --- Suggestion Feature ---

function SuggestionHeader({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="bg-gray-50 border-y border-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3">¿No encuentras tu producto favorito?</h3>
        <p className="text-gray-500 mb-6">Cuéntanos qué marca o producto te gustaría ver en AuraDerm. ¡Nosotras lo buscamos por ti!</p>
        <button
          onClick={onOpen}
          className="bg-gray-900 text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition hover:scale-105 shadow-lg flex items-center gap-2 mx-auto"
        >
          <i className="fas fa-lightbulb text-yellow-300"></i> Sugerir Producto
        </button>
      </div>
    </div>
  );
}

function SuggestionModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [formData, setFormData] = useState({ product: '', description: '', contact: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      await addDoc(collection(db, "sugerencias"), {
        ...formData,
        fecha: serverTimestamp(),
        estado: 'pendiente'
      });
      setStatus('success');
      setTimeout(() => { onClose(); setStatus('idle'); setFormData({ product: '', description: '', contact: '' }); }, 2500);
    } catch (error) {
      console.error("Error sending suggestion", error);
      setStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center transition">
          <i className="fas fa-times text-gray-600"></i>
        </button>

        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <i className="fas fa-magic text-4xl mb-3 text-yellow-300 animate-pulse"></i>
          <h3 className="text-2xl font-serif font-bold">Hagamos Magia</h3>
          <p className="text-indigo-100 text-sm mt-1">Ayúdanos a mejorar nuestro catálogo.</p>
        </div>

        {status === 'success' ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-check text-2xl text-green-600"></i>
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">¡Recibido!</h4>
            <p className="text-gray-500 text-sm">Gracias por tu sugerencia. La revisaremos pronto.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Nombre del Producto / Marca</label>
              <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition text-gray-800 font-medium placeholder-gray-300"
                value={formData.product} onChange={e => setFormData({ ...formData, product: e.target.value })} placeholder="Ej: The Ordinary Niacinamide..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">¿Algún detalle extra?</label>
              <textarea className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition text-gray-800 placeholder-gray-300" rows={2}
                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Es para piel grasa, lo vi en TikTok..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Tu Contacto (Opcional)</label>
              <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition text-gray-800 placeholder-gray-300"
                value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} placeholder="Email o WhatsApp para avisarte" />
            </div>
            <button type="submit" disabled={status === 'submitting'} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black transition shadow-lg transform active:scale-95 flex items-center justify-center gap-2">
              {status === 'submitting' ? <><i className="fas fa-spinner fa-spin"></i> Enviando...</> : 'Enviar Sugerencia'}
            </button>
          </form>
        )}
      </div>
    </div>
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
              onChange={e => setFormData({ ...formData, name: e.target.value })}
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
              onChange={e => setFormData({ ...formData, city: e.target.value })}
              placeholder="Ej: Bogotá, Medellín..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección Completa</label>
            <input
              required
              type="text"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D] transition"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder="Calle 123 # 45-67, Barrio, Ciudad"
            />
            <p className="text-xs text-red-500 font-medium mt-1 bg-red-50 p-2 rounded-lg border border-red-100">
              <i className="fas fa-exclamation-circle mr-1"></i>
              Nota: El costo de envío ($10.000 - $50.000) se suma al total y depende de tu ciudad.
            </p>
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

function Chatbot({ products, cartItems }: { products: Product[]; cartItems: CartItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "¡Hola! 🌸 Soy tu asesora de AuraDerm. ¿En qué puedo ayudarte hoy?" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSession = useRef<any>(null);

  const toggleChat = () => setIsOpen(!isOpen);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const cleanText = (text: string) => {
    // Remover asteriscos de markdown
    return text.replace(/\*\*/g, '');
  };

  const getSystemInstruction = () => {
    const productList = products.map(p => `- ${p.nombre}: ${formatPrice(p.precio)}`).join('\n');
    const cartStatus = cartItems.length > 0
      ? `CARRITO ACTUAL (${cartItems.length} productos): ${cartItems.map(item => `${item.quantity}x ${item.nombre}`).join(', ')}`
      : 'CARRITO VACÍO';

    return `
Eres la asistente virtual de AuraDerm. Tono amigable, natural y conversacional.

REGLAS CRÍTICAS:
- Respuestas MUY CORTAS (máximo 2-3 líneas).
- NO uses asteriscos, negritas ni markdown.
- Haz UNA pregunta a la vez.
- Usa emojis con moderación (🌸, ✨).
- Sé interactiva: pregunta, confirma, guía paso a paso.

${cartStatus}

PROCESO DE PEDIDO:
1. Si el usuario quiere hacer un pedido:
   - PRIMERO verifica si el carrito tiene productos
   - Si el carrito está VACÍO, di: "Tu carrito está vacío. Primero agrega productos desde la tienda 🛍️"
   - Si el carrito TIENE productos, pregunta: "Veo que tienes ${cartItems.length} producto(s) en tu carrito. Quieres hacer el pedido de esos productos?"
   - Si confirma, pide SOLO nombre
   - Luego pide SOLO ciudad
   - Usa createOrder con los productos del carrito

2. NUNCA uses createOrder si el carrito está vacío

CATÁLOGO:
${productList}

Ejemplos de respuestas CORRECTAS:
- "Claro! Para enviarte el pedido, necesito tu nombre completo 🌸"
- "Perfecto! Y en qué ciudad estás?"
- "Listo! Preparando tu pedido ✨"

Ejemplos INCORRECTOS (muy largos):
- NO hagas listas largas de productos
- NO des explicaciones extensas sin que te pregunten
    `.trim();
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

            // Validar que hay productos en el carrito
            if (cartItems.length === 0) {
              setMessages(prev => [...prev, {
                role: "model",
                text: cleanText("Tu carrito está vacío. Primero agrega productos desde la tienda 🛍️")
              }]);
              setIsLoading(false);
              return;
            }

            // Usar los productos del carrito
            const total = cartItems.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
            const link = generateWhatsAppLink(cartItems, total, { name: args.customerName, city: args.customerCity });

            functionResponses.push({
              id: call.id,
              name: call.name,
              response: { result: "success", link: link }
            });

            setMessages(prev => [...prev, {
              role: "model",
              text: cleanText(`¡Listo! He preparado tu pedido para ${args.customerName}. Haz clic abajo para confirmar en WhatsApp. ✨`),
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
        setMessages(prev => [...prev, { role: "model", text: cleanText(responseText) }]);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "model", text: "Ups, tuve un problema técnico 💆‍♀️ ¿Me lo repites?" }]);
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
              <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm whitespace-pre-wrap ${msg.role === 'user'
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
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
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

  // Fetch Blog Articles from Firestore
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "articulos"));
        const fetchedArticles: Article[] = [];
        console.log(`📰 Total artículos en Firebase: ${querySnapshot.size}`);

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`📄 Artículo "${data.titulo}":`, {
            publicado: data.publicado,
            categoria: data.categoria,
            autor: data.autor
          });

          // Solo mostrar artículos publicados
          if (data.publicado === true) {
            fetchedArticles.push({ id: doc.id, ...data } as Article);
          }
        });

        console.log(`✅ Artículos publicados: ${fetchedArticles.length}`);
        setArticles(fetchedArticles);
      } catch (error) {
        console.error("❌ Error fetching articles from Firebase:", error);
        setArticles([]);
      } finally {
        setLoadingArticles(false);
      }
    };

    fetchArticles();
  }, []);

  // Fetch Testimonials from Firestore
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "testimonios"));
        const fetchedTestimonials: Testimonial[] = [];
        console.log(`💬 Total testimonios en Firebase: ${querySnapshot.size}`);

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`💬 Testimonio de "${data.nombreCliente}":`, {
            calificacion: data.calificacion,
            destacado: data.destacado,
            verificado: data.verificado
          });

          fetchedTestimonials.push({ id: doc.id, ...data } as Testimonial);
        });

        // Ordenar: destacados primero, luego por calificación
        fetchedTestimonials.sort((a, b) => {
          if (a.destacado && !b.destacado) return -1;
          if (!a.destacado && b.destacado) return 1;
          return b.calificacion - a.calificacion;
        });

        console.log(`✅ Total testimonios cargados: ${fetchedTestimonials.length}`);
        console.log(`⭐ Testimonios destacados: ${fetchedTestimonials.filter(t => t.destacado).length}`);
        setTestimonials(fetchedTestimonials);
      } catch (error) {
        console.error("❌ Error fetching testimonials from Firebase:", error);
        setTestimonials([]);
      } finally {
        setLoadingTestimonials(false);
      }
    };

    fetchTestimonials();
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
      <SuggestionHeader onOpen={() => setIsSuggestionOpen(true)} />
      <Benefits />
      <CommunitySection articles={articles} loading={loadingArticles} testimonials={testimonials} />

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

      <Chatbot products={products} cartItems={cart} />

      <SuggestionModal isOpen={isSuggestionOpen} onClose={() => setIsSuggestionOpen(false)} />

      <Footer logoUrl={logoUrl} />
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
