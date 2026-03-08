/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Zap, 
  Settings, 
  Upload, 
  FileSearch, 
  CheckCircle2, 
  Loader2,
  Image as ImageIcon,
  User,
  ChevronRight,
  MessageSquare,
  Sparkles,
  X,
  Send,
  Search,
  Filter,
  Download,
  Share2,
  AlertCircle,
  Edit3,
  Trash2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Clock,
  Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { auth } from './firebase';
import AuthPage from './components/AuthPage';

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  issueTime: string;
  type: string;
  originalCurrency: string;
  totalPayable: number;
  totalAmount: number;
  taxAmount: number;
  supplier: {
    name: string;
    tin: string;
    id: string;
    registrationName: string;
  };
  buyer: {
    name: string;
    tin: string;
  };
  items: Array<{
    description: string;
    unitPrice: number;
    quantity: number;
    amount: number;
    tax: {
      amount: number;
    };
  }>;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<'en' | 'ms' | 'zh'>('en');
  
  const [aiAssistantMessage, setAiAssistantMessage] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [buyerDetails, setBuyerDetails] = useState({ name: "", tin: "" });

  const [showSupportChat, setShowSupportChat] = useState(false);
  const [supportMessages, setSupportMessages] = useState<Array<{ role: 'user' | 'ai', text: string }>>([
    { role: 'ai', text: "Hi! I'm your BilBoleh Support Assistant. How can I help you today with your e-invoicing?" }
  ]);
  const [supportInput, setSupportInput] = useState("");
  const [isSupportThinking, setIsSupportThinking] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSmartMode, setIsSmartMode] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'process' | 'architecture' | 'status'>('process');
  const [invoices, setInvoices] = useState([
    { id: '1', date: '2024-03-07 14:30', invNo: 'INV-001', customer: 'Ali Bin Ahmad', amount: 1250.00, tax: 75.00, uin: 'LHDN-88291-X', status: 'Validated' },
    { id: '2', date: '2024-03-07 15:15', invNo: 'INV-002', customer: 'Syarikat Maju Jaya', amount: 3500.00, tax: 210.00, uin: '', status: 'Rejected' },
    { id: '3', date: '2024-03-06 09:00', invNo: 'INV-003', customer: 'Tan Ah Kow', amount: 85.50, tax: 5.13, uin: 'LHDN-77123-A', status: 'Cancelled' },
    { id: '4', date: '2024-03-05 11:20', invNo: 'INV-004', customer: 'Global Tech Solutions', amount: 12000.00, tax: 720.00, uin: 'LHDN-99001-B', status: 'Validated' },
    { id: '5', date: '2024-03-04 16:45', invNo: 'INV-005', customer: 'Fatimah Bakery', amount: 45.00, tax: 2.70, uin: '', status: 'RejectedByBuyer' },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const scrollRef = useRef<HTMLDivElement>(null);

  const translations = {
    en: {
      dashboard: "Dashboard",
      status: "MyInvois Status",
      process: "Bilboleh Process",
      upload: "UPLOAD INVOICE",
      smart: "Smart Multimodal",
      multimodal: "Multimodal Understanding",
      optimized: "Optimized for messy, faded, or handwritten receipts.",
      submit: "Submit to LHDN",
      download: "Download JSON",
      welcome: "Welcome back,",
      system: "System Online",
      pages: "Pages",
      aiAssistant: "Financial Analysis",
      askAi: "Analyze with AI",
      aiThinking: "Analyzing invoice...",
      aiExplain: "Explain why this is invalid",
      aiClose: "Close Analysis",
      convert: "Convert to E-Invoice",
      buyerName: "Buyer Name",
      buyerTin: "Buyer TIN",
      update: "Update Details",
      supportTitle: "BilBoleh Support",
      supportPlaceholder: "Ask about MyInvois or technical issues...",
      send: "Send",
      validated: "Validated",
      rejected: "Rejected by LHDN",
      cancelled: "Cancelled",
      rejectedByBuyer: "Rejected by Buyer",
      invoiceLog: "Invoice Log",
      date: "Date & Time",
      invNo: "Invoice No.",
      customer: "Customer",
      amount: "Amount",
      tax: "Tax",
      uin: "LHDN UIN",
      statusLabel: "Status",
      searchPlaceholder: "Search by Customer, Inv #, or UIN...",
      filterStatus: "Filter Status",
      totalSales: "Total Sales",
      taxToRemit: "Tax to Remit",
      resolutionCenter: "Resolution Center",
      editResubmit: "Edit & Resubmit",
      share: "Share",
      cancelInv: "Cancel Invoice"
    },
    ms: {
      dashboard: "Papan Pemuka",
      status: "Status MyInvois",
      process: "Proses Bilboleh",
      upload: "MUAT NAIK INVOIS",
      smart: "Multimodal Pintar",
      multimodal: "Pemahaman Multimodal",
      optimized: "Dioptimumkan untuk resit yang comot, pudar atau bertulis tangan.",
      submit: "Hantar ke LHDN",
      download: "Muat Turun JSON",
      welcome: "Selamat kembali,",
      system: "Sistem Dalam Talian",
      pages: "Halaman",
      aiAssistant: "Analisis Kewangan",
      askAi: "Analisis dengan AI",
      aiThinking: "Menganalisis invois...",
      aiExplain: "Terangkan mengapa ini tidak sah",
      aiClose: "Tutup Analisis",
      convert: "Tukar ke E-Invois",
      buyerName: "Nama Pembeli",
      buyerTin: "TIN Pembeli",
      update: "Kemas Kini Butiran",
      supportTitle: "Sokongan BilBoleh",
      supportPlaceholder: "Tanya tentang MyInvois atau isu teknikal...",
      send: "Hantar",
      validated: "Disahkan",
      rejected: "Ditolak oleh LHDN",
      cancelled: "Dibatalkan",
      rejectedByBuyer: "Ditolak oleh Pembeli",
      invoiceLog: "Log Invois",
      date: "Tarikh & Masa",
      invNo: "No. Invois",
      customer: "Pelanggan",
      amount: "Jumlah",
      tax: "Cukai",
      uin: "UIN LHDN",
      statusLabel: "Status",
      searchPlaceholder: "Cari mengikut Pelanggan, No. Inv, atau UIN...",
      filterStatus: "Tapis Status",
      totalSales: "Jumlah Jualan",
      taxToRemit: "Cukai untuk Dihantar",
      resolutionCenter: "Pusat Resolusi",
      editResubmit: "Edit & Hantar Semula",
      share: "Kongsi",
      cancelInv: "Batal Invois"
    },
    zh: {
      dashboard: "仪表板",
      status: "MyInvois 状态",
      process: "Bilboleh 流程",
      upload: "上传发票",
      smart: "智能多模态",
      multimodal: "多模态理解",
      optimized: "针对凌乱、褪色或手写收据进行了优化。",
      submit: "提交至 LHDN",
      download: "下载 JSON",
      welcome: "欢迎回来，",
      system: "系统在线",
      pages: "页面",
      aiAssistant: "财务分析",
      askAi: "使用 AI 分析",
      aiThinking: "正在分析发票...",
      aiExplain: "解释为什么这无效",
      aiClose: "关闭分析",
      convert: "转换为电子发票",
      buyerName: "买家姓名",
      buyerTin: "买家税号 (TIN)",
      update: "更新详情",
      supportTitle: "BilBoleh 支持",
      supportPlaceholder: "询问有关 MyInvois 或技术问题...",
      send: "发送",
      validated: "已验证",
      rejected: "LHDN 已拒绝",
      cancelled: "已取消",
      rejectedByBuyer: "买家已拒绝",
      invoiceLog: "发票日志",
      date: "日期与时间",
      invNo: "发票编号",
      customer: "客户",
      amount: "金额",
      tax: "税额",
      uin: "LHDN UIN",
      statusLabel: "状态",
      searchPlaceholder: "按客户、发票号或 UIN 搜索...",
      filterStatus: "过滤状态",
      totalSales: "总销售额",
      taxToRemit: "待缴税款",
      resolutionCenter: "解决中心",
      editResubmit: "编辑并重新提交",
      share: "分享",
      cancelInv: "取消发票"
    }
  };

  const t = translations[language];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [supportMessages]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#f8fafc]">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-pink-200/40 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-200/40 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg glow-pink"
          >
            <Zap size={32} />
          </motion.div>
          <p className="text-slate-500 font-bold tracking-widest uppercase text-xs animate-pulse">Loading Bilboleh...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onSuccess={(u) => {
      setUser(u);
      setActiveTab('architecture');
    }} />;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      setExtractedData(null);
      setError(null);
    }
  };

  const formatAsTxt = (data: InvoiceData) => {
    if (!data) return "";
    
    let text = `INVOICE DATA SUMMARY\n`;
    text += `====================\n\n`;
    text += `DOCUMENT INFO:\n`;
    text += `- ID: ${data.invoiceNumber || 'N/A'}\n`;
    text += `- Date: ${data.issueDate || 'N/A'}\n`;
    text += `- Type: ${data.type || '01'}\n`;
    text += `- Currency: ${data.originalCurrency || 'MYR'}\n\n`;
    
    text += `VENDOR INFO:\n`;
    text += `- Name: ${data.supplier?.name || 'N/A'}\n`;
    text += `- TIN: ${data.supplier?.tin || 'N/A'}\n\n`;
    
    text += `FINANCIALS:\n`;
    text += `- Tax Amount: ${data.taxAmount || 0}\n`;
    text += `- Total Amount: ${data.totalAmount || 0}\n`;
    text += `- Total Payable: ${data.totalPayable || 0}\n\n`;
    
    text += `LINE ITEMS:\n`;
    const lines = data.items || [];
    lines.forEach((line: any, i: number) => {
      text += `${i + 1}. ${line.description || 'Item'} | Qty: ${line.quantity || 0} | Price: ${line.unitPrice || 0} | Amount: ${line.amount || 0}\n`;
    });
    
    return text;
  };

  const getAiAssistance = async () => {
    if (!extractedData && !error) return;
    
    setIsAiThinking(true);
    setShowAiAssistant(true);
    setAiAssistantMessage(null);

    try {
      let prompt = "";
      
      if (extractedData) {
        prompt = `You are an expert AI Financial Analyst built into the BilBoleh application.
        The user will provide you with a JSON object representing an e-invoice formatted for the Malaysian LHDN MyInvois API.
        Your task is to analyze this specific invoice data and provide a rapid, actionable business insight for the SME owner.
        Do not output code. Output your response as a short, easy-to-read summary with the following three bullet points:
        
        - Compliance Check: Point out if any critical fields (like Supplier TIN or Total Tax) seem to be missing or look suspiciously formatted, which might cause the LHDN API to reject it.
        - Financial Summary: Briefly state the total cash outflow and the exact tax burden of this transaction.
        - Business Insight: Look at the "items" array and provide one sentence summarizing what this business expense represents (e.g., "This appears to be a heavy stock restock for office supplies" or "This is a standard utility bill").
        
        Keep the tone professional, sharp, and highly relevant to a Malaysian business context.
        
        Payload: ${JSON.stringify(extractedData)}`;
      } else {
        prompt = `You are the official AI Support Assistant for BilBoleh. 
        The user encountered an error while processing an invoice: "${error}". 
        Explain why this might have happened and what the user can do to fix it (e.g., check if image is blurry, lighting is too dark, or API key is correct). 
        Keep it short and supportive.`;
      }

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ parts: [{ text: prompt }] }],
      });

      setAiAssistantMessage(response.text || "I couldn't analyze the data at this moment.");
    } catch (err) {
      setAiAssistantMessage("Sorry, I encountered an error while trying to help you.");
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleSupportSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!supportInput.trim() || isSupportThinking) return;

    const userMsg = supportInput.trim();
    setSupportMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setSupportInput("");
    setIsSupportThinking(true);

    try {
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: 'user',
            parts: [{
              text: `You are the official AI Support Assistant for BilBoleh, an e-invoicing web application designed to help Malaysian Small and Medium Enterprises (SMEs) comply with the LHDN MyInvois standard.
              Your primary job is to help users troubleshoot technical issues, guide them through the app's features, and answer basic questions about Malaysian tax compliance.
              Always be polite, concise, and highly supportive. You must be able to understand and respond naturally in both English and Bahasa Malaysia, including common local business terms.
              If a user asks why their receipt failed to process, advise them to check if their image is blurry, if the lighting is too dark, or if their API key is correctly entered in the settings.
              Do not provide legally binding financial advice. Keep your responses short and formatted for a small chat window.
              
              User Question: ${userMsg}`
            }]
          }
        ],
      });

      setSupportMessages(prev => [...prev, { role: 'ai', text: response.text || "I'm sorry, I couldn't process that." }]);
    } catch (err) {
      setSupportMessages(prev => [...prev, { role: 'ai', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsSupportThinking(false);
    }
  };

  const processInvoice = async () => {
    if (!file || !preview) return;

    setIsProcessing(true);
    setError(null);

    try {
      const base64Data = preview.split(',')[1];
      const mimeType = file.type;

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            parts: [
              {
                text: `You are an expert Malaysian tax compliance assistant, specializing in the LHDN MyInvois standard.
                Analyze the provided receipt/invoice image and extract all relevant data.
                Crucially, format your output strictly as a valid JSON file. The JSON must match the precise LHDN MyInvois API schema, ensuring that key names are exact and hierarchy is maintained.

                Required structure to generate for the LHDN MyInvois API:
                {
                  "invoiceNumber": "",
                  "issueDate": "",
                  "issueTime": "",
                  "type": "01",
                  "originalCurrency": "MYR",
                  "totalPayable": 0.00,
                  "totalAmount": 0.00,
                  "taxAmount": 0.00,
                  "supplier": {
                    "name": "",
                    "tin": "",
                    "id": "",
                    "registrationName": ""
                  },
                  "buyer": {
                    "name": "CASH CUSTOMER",
                    "tin": "G1234567890"
                  },
                  "items": [
                    {
                      "description": "",
                      "unitPrice": 0.00,
                      "quantity": 0,
                      "amount": 0.00,
                      "tax": {
                        "amount": 0.00
                      }
                    }
                  ]
                }

                Ensure all numerical fields are formatted as numbers, not strings. Use your multilingual capability to interpret descriptions (e.g., English, Malay, local slang).
                Output ONLY the JSON object. Do not wrap it in markdown. Do not include introductory text.`
              },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const resultText = response.text;
      if (resultText) {
        const parsedData = JSON.parse(resultText) as InvoiceData;
        setExtractedData(parsedData);
      }
    } catch (err) {
      console.error("Error processing invoice:", err);
      setError("Failed to process invoice. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Dashboard State
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.customer.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          inv.invNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.uin.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    validated: invoices.filter(i => i.status === 'Validated').length,
    rejected: invoices.filter(i => i.status === 'Rejected').length,
    cancelled: invoices.filter(i => i.status === 'Cancelled').length,
    rejectedByBuyer: invoices.filter(i => i.status === 'RejectedByBuyer').length,
    totalSales: invoices.filter(i => i.status === 'Validated').reduce((acc, curr) => acc + curr.amount, 0),
    taxToRemit: invoices.filter(i => i.status === 'Validated').reduce((acc, curr) => acc + curr.tax, 0),
  };

  const handleConvert = () => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      buyer: {
        name: buyerDetails.name || extractedData.buyer.name,
        tin: buyerDetails.tin || extractedData.buyer.tin
      }
    });
    setShowConvertModal(false);
  };

  return (
    <div className={`flex h-screen w-full p-6 gap-6 overflow-hidden ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarCollapsed ? 80 : 288 }}
        className={`${theme === 'dark' ? 'glass-dark' : 'glass'} squircle p-6 flex flex-col gap-8 transition-all duration-300 overflow-hidden`}
      >
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/30 shrink-0 glow-pink">
            <Zap className="text-white fill-white" size={24} />
          </div>
          {!isSidebarCollapsed && (
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
            >
              Bilboleh
            </motion.h1>
          )}
        </div>

        <nav className="flex flex-col gap-2">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label={isSidebarCollapsed ? "" : t.dashboard} 
            onClick={() => setActiveTab('architecture')}
            active={activeTab === 'architecture'}
            collapsed={isSidebarCollapsed}
            theme={theme}
          />
          <NavItem 
            icon={<FileText size={20} />} 
            label={isSidebarCollapsed ? "" : t.status} 
            onClick={() => setActiveTab('status')}
            active={activeTab === 'status'}
            collapsed={isSidebarCollapsed} 
            theme={theme} 
          />
          <NavItem 
            icon={<Zap size={20} />} 
            label={isSidebarCollapsed ? "" : t.process} 
            onClick={() => setActiveTab('process')}
            active={activeTab === 'process'} 
            collapsed={isSidebarCollapsed}
            theme={theme}
          />
        </nav>

        {!isSidebarCollapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} rounded-3xl p-4 border border-white/10`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-pink-500 fill-pink-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-pink-500">Cloud Backend</span>
            </div>
            <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}>LHDN Microservice</p>
            <p className={`text-[10px] ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'} leading-relaxed`}>
              Python FastAPI service ready for Google Cloud Run deployment.
            </p>
          </motion.div>
        )}

        <div className="mt-auto">
          <div className={`${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} rounded-3xl p-4 flex items-center gap-3`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shrink-0 shadow-lg">
              <User size={20} className="text-white" />
            </div>
            {!isSidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className={`text-xs ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'}`}>{t.welcome}</p>
                <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Amirul</p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-6">
        {/* Top Header */}
        <motion.header 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`${theme === 'dark' ? 'glass-dark' : 'glass'} h-20 squircle px-8 flex items-center justify-between`}
        >
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-2 ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-900/5'} rounded-xl transition-colors ${theme === 'dark' ? 'text-white/60' : 'text-slate-600'}`}
            >
              <LayoutDashboard size={20} />
            </button>
            <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>
              <span>{t.pages}</span>
              <ChevronRight size={14} />
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {activeTab === 'process' ? t.process : activeTab === 'status' ? t.status : t.dashboard}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`${theme === 'dark' ? 'neumorph-pill-dark' : 'neumorph-pill'} px-4 py-2 flex items-center gap-2`}>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-white/60' : 'text-slate-600'}`}>{t.system}</span>
            </div>
            
            <div className={`${theme === 'dark' ? 'neumorph-pill-dark' : 'neumorph-pill'} flex items-center p-1 gap-1`}>
              <button 
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-white shadow-sm text-pink-500' : 'text-white/40'}`}
              >
                <Zap size={16} />
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-slate-700 shadow-sm text-cyan-400' : 'text-slate-400'}`}
              >
                <Zap size={16} className="rotate-180" />
              </button>
            </div>

            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className={`${theme === 'dark' ? 'neumorph-pill-dark' : 'neumorph-pill'} px-3 py-2 text-xs font-bold outline-none cursor-pointer appearance-none text-center min-w-[80px]`}
            >
              <option value="en">EN</option>
              <option value="ms">BM</option>
              <option value="zh">中文</option>
            </select>

            <button 
              onClick={handleLogout}
              className={`p-2 ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-900/5'} rounded-full transition-colors ${theme === 'dark' ? 'text-white/60' : 'text-slate-600'} flex items-center gap-2`}
              title="Logout"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold hidden md:block">{user?.displayName || user?.email?.split('@')[0]}</span>
            </button>

            <button className={`p-2 ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-900/5'} rounded-full transition-colors ${theme === 'dark' ? 'text-white/60' : 'text-slate-600'}`}>
              <Settings size={20} />
            </button>
          </div>
        </motion.header>

        {/* Action Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'process' ? (
            <motion.div 
              key="process"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 grid grid-cols-2 gap-6 overflow-hidden"
            >
              {/* Module 1: Upload */}
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className={`${theme === 'dark' ? 'glass-dark' : 'glass'} squircle p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
                <div className="flex items-center justify-between relative z-10">
                  <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    <span className="text-pink-500">1.</span> {t.upload}
                  </h2>
                  <div className={`flex items-center gap-2 ${theme === 'dark' ? 'neumorph-pill-dark' : 'neumorph-pill'} px-3 py-1`}>
                    <div className={`w-2 h-2 rounded-full ${isSmartMode ? 'bg-pink-500 glow-pink' : 'bg-white/20'}`} />
                    <span className="text-[10px] font-bold tracking-wider uppercase">{t.smart}</span>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} rounded-3xl border border-white/10 relative z-10`}>
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 glow-pink">
                    <Zap size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold">{t.multimodal}</p>
                    <p className={`text-[10px] ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'} leading-tight`}>{t.optimized}</p>
                  </div>
                  <button 
                    onClick={() => setIsSmartMode(!isSmartMode)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${isSmartMode ? 'bg-pink-500' : 'bg-white/10'}`}
                  >
                    <motion.div 
                      animate={{ x: isSmartMode ? 20 : 2 }}
                      className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group relative z-10
                    ${preview ? 'border-pink-500/50 bg-pink-500/5' : 'border-white/20 hover:border-pink-500/30 hover:bg-pink-500/5'}`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="image/*,application/pdf"
                  />
                  
                  {preview ? (
                    <div className="relative w-full h-full p-4">
                      <img 
                        src={preview} 
                        alt="Invoice Preview" 
                        className="w-full h-full object-contain rounded-2xl shadow-2xl border border-pink-500/30"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                        <p className="text-sm font-medium text-white">Click to change file</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center group-hover:scale-110 transition-transform glow-pink">
                        <ImageIcon className="text-pink-500" size={32} />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-medium">Drop your invoice here</p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'}`}>Supports JPG, PNG, PDF</p>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={processInvoice}
                  disabled={!file || isProcessing}
                  className={`w-full py-5 rounded-[2rem] font-bold text-xl flex items-center justify-center gap-3 transition-all shadow-xl relative z-10
                    ${!file || isProcessing 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:shadow-pink-500/30 active:scale-[0.98] glow-pink'}`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={24} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap size={24} className="fill-current" />
                      Process Invoice
                    </>
                  )}
                </button>
              </motion.div>

              {/* Module 2: Extracted Data */}
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={`${theme === 'dark' ? 'glass-dark' : 'glass'} squircle p-8 flex flex-col gap-6 overflow-hidden shadow-2xl relative`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex flex-col">
                    <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>LHDN</h2>
                    <h3 className={`text-xl font-bold -mt-1 ${theme === 'dark' ? 'text-white/80' : 'text-slate-700'}`}>PAYLOAD (MyInvois)</h3>
                  </div>
                  <div className={`flex items-center gap-2 ${theme === 'dark' ? 'neumorph-pill-dark' : 'neumorph-pill'} px-4 py-2`}>
                    <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center glow-blue">
                      <CheckCircle2 size={10} className="text-blue-500" />
                    </div>
                    <span className={`text-[10px] font-bold tracking-wider uppercase ${theme === 'dark' ? 'text-white/60' : 'text-slate-600'}`}>LHDN Compliant</span>
                  </div>
                </div>

                <div className={`flex-1 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} rounded-[2rem] p-6 overflow-auto font-mono text-sm relative border border-white/10 z-10`}>
                  <AnimatePresence mode="wait">
                    {extractedData ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <pre className={`${theme === 'dark' ? 'text-cyan-300' : 'text-slate-700'} whitespace-pre-wrap leading-relaxed`}>
                          {formatAsTxt(extractedData)}
                        </pre>
                      </motion.div>
                    ) : isProcessing ? (
                      <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
                        <Loader2 className="animate-spin" size={48} />
                        <p className="animate-pulse">Mapping to LHDN Schema...</p>
                      </div>
                    ) : error ? (
                      <div className="h-full flex flex-col items-center justify-center gap-4 text-red-400">
                        <FileSearch size={48} />
                        <p>{error}</p>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-300">
                        <FileSearch size={48} />
                        <p>No data extracted yet</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex gap-4 relative z-10">
                  <button 
                    onClick={() => setShowConvertModal(true)}
                    className={`flex-1 py-4 ${theme === 'dark' ? 'glass-dark' : 'glass'} rounded-2xl text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-700'} hover:bg-emerald-500 hover:text-white transition-all glow-emerald`}
                  >
                    {t.convert}
                  </button>
                  <button className={`flex-1 py-4 ${theme === 'dark' ? 'glass-dark' : 'glass'} rounded-2xl text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-700'} hover:bg-blue-500 hover:text-white transition-all glow-blue`}>
                    {t.submit}
                  </button>
                  <button className={`flex-1 py-4 ${theme === 'dark' ? 'glass-dark' : 'glass'} rounded-2xl text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-700'} hover:bg-purple-500 hover:text-white transition-all`}>
                    {t.download}
                  </button>
                </div>

                {/* AI Assistant Trigger */}
                {(extractedData || error) && (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={getAiAssistance}
                    className={`mt-2 py-3 px-6 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all relative z-10
                      ${theme === 'dark' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-pink-500/10 text-pink-600 border border-pink-500/20'}
                      hover:scale-[1.02] active:scale-[0.98]`}
                  >
                    <motion.div
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Sparkles size={16} />
                    </motion.div>
                    {t.askAi}
                  </motion.button>
                )}
              </motion.div>
            </motion.div>
          ) : activeTab === 'status' ? (
            <motion.div 
              key="status"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-6 overflow-hidden"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-6">
                {[
                  { label: t.validated, value: stats.validated, color: 'emerald', icon: <CheckCircle2 size={24} /> },
                  { label: t.rejected, value: stats.rejected, color: 'rose', icon: <AlertCircle size={24} /> },
                  { label: t.cancelled, value: stats.cancelled, color: 'slate', icon: <Ban size={24} /> },
                  { label: t.rejectedByBuyer, value: stats.rejectedByBuyer, color: 'orange', icon: <User size={24} /> },
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`${theme === 'dark' ? 'glass-dark' : 'glass'} squircle p-6 border border-white/10 shadow-xl relative overflow-hidden group`}
                  >
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/10 blur-2xl rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500`} />
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'} mb-1`}>{stat.label}</p>
                        <h3 className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stat.value}</h3>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-500`}>
                        {stat.icon}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Main Dashboard Grid */}
              <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
                {/* Invoice Log */}
                <div className={`col-span-2 ${theme === 'dark' ? 'glass-dark' : 'glass'} squircle p-8 flex flex-col gap-6 shadow-2xl overflow-hidden border border-white/10`}>
                  <div className="flex items-center justify-between">
                    <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.invoiceLog}</h2>
                    <div className="flex gap-3">
                      <div className={`relative ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} rounded-xl border border-white/10 flex items-center px-4`}>
                        <Search size={16} className="text-slate-400" />
                        <input 
                          type="text" 
                          placeholder={t.searchPlaceholder}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-transparent border-none outline-none p-2 text-xs w-64"
                        />
                      </div>
                      <div className={`relative ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} rounded-xl border border-white/10 flex items-center px-4`}>
                        <Filter size={16} className="text-slate-400" />
                        <select 
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="bg-transparent border-none outline-none p-2 text-xs appearance-none cursor-pointer"
                        >
                          <option value="All">All Status</option>
                          <option value="Validated">Validated</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="RejectedByBuyer">Rejected by Buyer</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'} border-b border-white/10`}>
                          <th className="pb-4 font-bold">{t.date}</th>
                          <th className="pb-4 font-bold">{t.invNo}</th>
                          <th className="pb-4 font-bold">{t.customer}</th>
                          <th className="pb-4 font-bold">{t.amount}</th>
                          <th className="pb-4 font-bold">{t.statusLabel}</th>
                          <th className="pb-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredInvoices.map((inv) => (
                          <tr key={inv.id} className={`group ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-900/5'} transition-colors`}>
                            <td className="py-4 text-xs">
                              <div className="flex items-center gap-2">
                                <Clock size={12} className="text-slate-400" />
                                {inv.date}
                              </div>
                            </td>
                            <td className="py-4 text-xs font-bold">{inv.invNo}</td>
                            <td className="py-4 text-xs">{inv.customer}</td>
                            <td className="py-4 text-xs font-bold">
                              <p>MYR {inv.amount.toFixed(2)}</p>
                              <p className="text-[10px] opacity-40">Tax: {inv.tax.toFixed(2)}</p>
                            </td>
                            <td className="py-4 text-xs">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                                ${inv.status === 'Validated' ? 'bg-emerald-500/10 text-emerald-500' : 
                                  inv.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500' : 
                                  inv.status === 'Cancelled' ? 'bg-slate-500/10 text-slate-500' : 
                                  'bg-orange-500/10 text-orange-500'}`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 rounded-lg hover:bg-pink-500 hover:text-white transition-all" title={t.share}><Share2 size={14} /></button>
                                <button className="p-2 rounded-lg hover:bg-pink-500 hover:text-white transition-all" title={t.download}><Download size={14} /></button>
                                {inv.status === 'Validated' && (
                                  <button className="p-2 rounded-lg hover:bg-rose-500 hover:text-white transition-all" title={t.cancelInv}><Ban size={14} /></button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sidebar Stats & Resolution */}
                <div className="flex flex-col gap-6">
                  {/* Financial Summary */}
                  <div className={`${theme === 'dark' ? 'glass-dark' : 'glass'} squircle p-6 border border-white/10 shadow-xl flex flex-col gap-4`}>
                    <h4 className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'}`}>Financial Summary</h4>
                    <div className="space-y-4">
                      <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} border border-white/10`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.totalSales}</p>
                          <ArrowUpRight size={14} className="text-emerald-500" />
                        </div>
                        <p className="text-xl font-black">MYR {stats.totalSales.toLocaleString()}</p>
                      </div>
                      <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} border border-white/10`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.taxToRemit}</p>
                          <ArrowDownRight size={14} className="text-rose-500" />
                        </div>
                        <p className="text-xl font-black">MYR {stats.taxToRemit.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Resolution Center */}
                  <div className={`flex-1 ${theme === 'dark' ? 'glass-dark' : 'glass'} squircle p-6 border border-white/10 shadow-xl flex flex-col gap-4 overflow-hidden`}>
                    <div className="flex items-center gap-2">
                      <AlertCircle size={18} className="text-rose-500" />
                      <h4 className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'}`}>{t.resolutionCenter}</h4>
                    </div>
                    
                    <div className="flex-1 overflow-auto space-y-3">
                      {invoices.filter(i => i.status === 'Rejected').map((inv, i) => (
                        <div key={i} className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-rose-500/5' : 'bg-rose-500/5'} border border-rose-500/20 flex flex-col gap-2`}>
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">{inv.invNo}</p>
                            <span className="text-[10px] text-slate-400">Error: [err:TIN_INVALID]</span>
                          </div>
                          <p className="text-xs font-medium">The Buyer's Tax Number (TIN) is incorrect or not registered with LHDN.</p>
                          <button className="mt-2 py-2 w-full rounded-xl bg-rose-500 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-rose-600 transition-colors flex items-center justify-center gap-2">
                            <Edit3 size={12} />
                            {t.editResubmit}
                          </button>
                        </div>
                      ))}
                      {invoices.filter(i => i.status === 'Rejected').length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-50">
                          <CheckCircle2 size={32} strokeWidth={1} />
                          <p className="text-[10px] text-center">No pending errors. All systems go!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="architecture"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`flex-1 ${theme === 'dark' ? 'glass-dark' : 'glass'} squircle p-8 flex flex-col gap-6 overflow-hidden shadow-2xl`}
            >
              <div className="flex items-center justify-between">
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-pink-400' : 'text-slate-900'}`}>Backend Microservice Architecture</h2>
                <div className={`${theme === 'dark' ? 'neumorph-pill-dark' : 'neumorph-pill'} px-4 py-2 flex items-center gap-2`}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className={`text-xs font-mono ${theme === 'dark' ? 'text-white/60' : 'text-slate-600'}`}>Cloud Run Optimized</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {[
                  { title: "1. Creation", desc: "FastAPI endpoint receives raw transaction data with Pydantic validation." },
                  { title: "2. Submission", desc: "Automated mapping to LHDN MyInvois JSON Schema with PKI Digital Signature." },
                  { title: "3. Validation", desc: "Real-time interaction with LHDN Sandbox/Production APIs for document clearance." }
                ].map((item, i) => (
                  <div key={i} className={`${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} p-6 rounded-[2rem] border border-white/10 shadow-sm`}>
                    <h3 className="text-pink-500 font-bold mb-2">{item.title}</h3>
                    <p className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-slate-600'} leading-relaxed`}>{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className={`flex-1 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} rounded-[2rem] p-8 overflow-auto border border-white/10`}>
                <h4 className={`text-sm font-bold ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'} uppercase tracking-widest mb-4`}>Deployment Guide: Google Secret Manager</h4>
                <div className="space-y-4 text-sm">
                  {[
                    { step: "Step 1: Store Secrets", code: "gcloud secrets create LHDN_CLIENT_ID --replication-policy=\"automatic\"" },
                    { step: "Step 2: Grant Access", desc: "Assign 'Secret Manager Secret Accessor' role to the Cloud Run service account." },
                    { step: "Step 3: Mount in Cloud Run", desc: "Configure Cloud Run to expose secrets as environment variables at runtime." }
                  ].map((item, i) => (
                    <div key={i} className={`${theme === 'dark' ? 'glass-dark' : 'glass'} rounded-2xl p-4 border border-white/10`}>
                      <p className="font-bold text-pink-500 mb-1">{item.step}</p>
                      {item.code ? (
                        <code className={`text-xs ${theme === 'dark' ? 'bg-black/30' : 'bg-slate-900/5'} p-2 block rounded-lg mt-2 font-mono`}>{item.code}</code>
                      ) : (
                        <p className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-slate-600'}`}>{item.desc}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Support Chat Bubble */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowSupportChat(!showSupportChat)}
          className={`fixed bottom-10 right-10 w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 shadow-2xl flex items-center justify-center text-white z-[60] glow-pink border-2 border-white/20`}
        >
          {showSupportChat ? <X size={28} /> : <MessageSquare size={28} />}
        </motion.button>

        {/* Support Chat Window */}
        <AnimatePresence>
          {showSupportChat && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={`fixed bottom-28 right-10 w-80 h-[450px] ${theme === 'dark' ? 'glass-dark' : 'glass'} squircle shadow-2xl z-[60] flex flex-col overflow-hidden border border-white/20`}
            >
              <div className="p-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} />
                  <span className="font-bold text-sm">{t.supportTitle}</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <div ref={scrollRef} className="flex-1 overflow-auto p-4 flex flex-col gap-3">
                {supportMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm
                      ${msg.role === 'user' 
                        ? 'bg-pink-500 text-white rounded-tr-none' 
                        : (theme === 'dark' ? 'bg-white/10 text-white rounded-tl-none' : 'bg-slate-100 text-slate-800 rounded-tl-none')}`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isSupportThinking && (
                  <div className="flex justify-start">
                    <div className={`p-3 rounded-2xl rounded-tl-none ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-100'} flex gap-1`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSupportSubmit} className="p-4 border-t border-white/10 flex gap-2">
                <input 
                  type="text"
                  value={supportInput}
                  onChange={(e) => setSupportInput(e.target.value)}
                  placeholder={t.supportPlaceholder}
                  className={`flex-1 bg-transparent border-none outline-none text-xs ${theme === 'dark' ? 'text-white placeholder:text-white/30' : 'text-slate-800 placeholder:text-slate-400'}`}
                />
                <button 
                  type="submit"
                  disabled={!supportInput.trim() || isSupportThinking}
                  className={`p-2 rounded-xl bg-pink-500 text-white disabled:opacity-50 transition-all`}
                >
                  <Send size={16} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Assistant Overlay */}
        <AnimatePresence>
          {showAiAssistant && (
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              className={`fixed bottom-10 right-10 w-[400px] max-h-[500px] ${theme === 'dark' ? 'glass-dark' : 'glass'} squircle p-6 shadow-2xl z-50 flex flex-col gap-4 border border-white/20`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <h3 className="font-bold">{t.aiAssistant}</h3>
                </div>
                <button 
                  onClick={() => setShowAiAssistant(false)}
                  className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-900/5'} transition-colors`}
                >
                  <X size={18} />
                </button>
              </div>

              <div className={`flex-1 overflow-auto p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} border border-white/10`}>
                {isAiThinking ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-3 text-slate-400">
                    <Loader2 className="animate-spin" size={24} />
                    <p className="text-xs font-medium animate-pulse">{t.aiThinking}</p>
                  </div>
                ) : (
                  <div className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-white/80' : 'text-slate-700'}`}>
                    {aiAssistantMessage}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowAiAssistant(false)}
                className={`w-full py-3 rounded-xl font-bold text-sm ${theme === 'dark' ? 'bg-white/10 text-white' : 'bg-slate-900/10 text-slate-900'} hover:bg-pink-500 hover:text-white transition-all`}
              >
                {t.aiClose}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Convert to E-Invoice Modal */}
        <AnimatePresence>
          {showConvertModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className={`${theme === 'dark' ? 'glass-dark' : 'glass'} w-full max-w-md squircle p-8 shadow-2xl relative overflow-hidden border border-white/20`}
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full -mr-32 -mt-32" />
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 glow-emerald">
                      <Zap className="text-white" size={24} />
                    </div>
                    <div>
                      <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.convert}</h2>
                      <p className={`text-xs ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'}`}>Add Buyer Details</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowConvertModal(false)}
                    className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-900/5'} transition-colors`}
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-4 relative z-10">
                  <div>
                    <label className={`block text-xs font-bold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'}`}>{t.buyerName}</label>
                    <input 
                      type="text"
                      value={buyerDetails.name}
                      onChange={(e) => setBuyerDetails({...buyerDetails, name: e.target.value})}
                      placeholder="e.g. Syarikat Maju Jaya Sdn Bhd"
                      className={`w-full p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} border border-white/10 focus:outline-none focus:border-emerald-500/50 transition-colors`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'}`}>{t.buyerTin}</label>
                    <input 
                      type="text"
                      value={buyerDetails.tin}
                      onChange={(e) => setBuyerDetails({...buyerDetails, tin: e.target.value})}
                      placeholder="e.g. C1234567890"
                      className={`w-full p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} border border-white/10 focus:outline-none focus:border-emerald-500/50 transition-colors`}
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end relative z-10">
                  <button 
                    onClick={handleConvert}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-[0.98] glow-emerald"
                  >
                    {t.update}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick, collapsed = false, theme = 'light' }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, collapsed?: boolean, theme?: string }) {
  return (
    <div 
      onClick={onClick}
      className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all group
      ${active 
        ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-slate-900/10 text-slate-900') 
        : (theme === 'dark' ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-900/5')}`}
    >
      {active && (
        <motion.div 
          layoutId="active-pill"
          className="absolute left-0 w-1 h-6 bg-pink-500 rounded-r-full shadow-[0_0_10px_rgba(236,72,153,0.8)]" 
        />
      )}
      <div className={`shrink-0 ${active ? 'text-pink-500' : ''}`}>{icon}</div>
      {!collapsed && <span className="font-medium whitespace-nowrap">{label}</span>}
    </div>
  );
}

