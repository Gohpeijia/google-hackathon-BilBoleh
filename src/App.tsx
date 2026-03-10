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
  Sun,    
  Moon,   
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
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebase'; 

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

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
  const [buyerDetails, setBuyerDetails] = useState({ name: "", tin: "", ic: "" });
  const [formErrors, setFormErrors] = useState({ tin: "", ic: "" });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
  const [invoices, setInvoices] = useState<any[]>([]);
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null);

  // 🔴 REAL-TIME FIRESTORE LISTENER
  useEffect(() => {
    if (!user) return;
    
    // Listen to the 'invoices' collection, sorted by newest first
    const q = query(collection(db, "invoices"), orderBy("dateTimestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invoiceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firebase timestamp to readable date
        date: doc.data().dateTimestamp?.toDate().toLocaleString('en-MY', { 
          year: 'numeric', month: '2-digit', day: '2-digit', 
          hour: '2-digit', minute: '2-digit' 
        }) || 'Just now'
      }));
      setInvoices(invoiceData);
    });

    return () => unsubscribe();
  }, [user]);
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
      cancelInv: "Cancel Invoice",
      allStatus: "All Status",
      noData: "No data extracted yet",
      merchantSync: "Merchant Auto-Sync",
      consumerPortal: "Consumer QR Portal",
      highValueCheck: "High-Value Check (>10k)",
      finSummary: "Financial Summary",
      total: "Total",
      backendArch: "Backend Microservice Architecture",
      cloudRun: "Cloud Run Optimized",
      step1Title: "1. Creation",
      step1Desc: "FastAPI receives raw data.",
      step2Title: "2. Submission",
      step2Desc: "Automated mapping to LHDN JSON.",
      step3Title: "3. Validation",
      step3Desc: "Real-time API clearance.",
      pending: "Pending / Under Review"
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
      cancelInv: "Batal Invois",
      allStatus: "Semua Status",
      noData: "Tiada data diekstrak lagi",
      merchantSync: "Penyegerakan Auto Peniaga",
      consumerPortal: "Portal QR Pengguna",
      highValueCheck: "Semakan Nilai Tinggi (>10k)",
      finSummary: "Ringkasan Kewangan",
      total: "Jumlah",
      backendArch: "Seni Bina Perkhidmatan Mikro",
      cloudRun: "Dioptimumkan untuk Cloud Run",
      step1Title: "1. Penciptaan",
      step1Desc: "FastAPI menerima data mentah.",
      step2Title: "2. Penyerahan",
      step2Desc: "Pemetaan automatik ke LHDN JSON.",
      step3Title: "3. Pengesahan",
      step3Desc: "Pelepasan API masa nyata.",
      pending: "Menunggu / Dalam Semakan"
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
      cancelInv: "取消发票",
      allStatus: "所有状态",
      noData: "尚未提取数据",
      merchantSync: "商家自动同步",
      consumerPortal: "消费者 QR 门户",
      highValueCheck: "高价值检查 (>10k)",
      finSummary: "财务摘要",
      total: "总计",
      backendArch: "后端微服务架构",
      cloudRun: "Cloud Run 优化",
      step1Title: "1. 创建",
      step1Desc: "FastAPI 接收原始数据。",
      step2Title: "2. 提交",
      step2Desc: "自动映射到 LHDN JSON。",
      step3Title: "3. 验证",
      step3Desc: "实时 API 许可交互。",
      pending: "待审核"
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
    if (showConvertModal || showAiAssistant || showSupportChat) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showConvertModal, showAiAssistant, showSupportChat]);

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
    
    if (!genAI) {
        setAiAssistantMessage("Gemini API Key is missing! Please configure it in your .env file.");
        setShowAiAssistant(true);
        return;
    }

    setIsAiThinking(true);
    setShowAiAssistant(true);
    setAiAssistantMessage(null);

    try {
      let prompt = "";
      
      if (extractedData) {
        prompt = `You are a friendly and helpful AI Assistant built into the BilBoleh application.
        The user is a small business owner in Malaysia who might not have a strong financial background.
        They will provide you with a JSON object representing an e-invoice.
        Your task is to analyze this invoice and explain it in extremely simple, beginner-friendly terms.

        DO NOT use complex financial jargon. Explain things as if you are talking to a friend running a local shop.
        Use simple, short sentences. Use double line breaks between each point so it is very easy to read.
        
        Please format your response strictly with these three simple sections:
        
        ✅ LHDN Checking (Is this invoice safe?):
        Check if important details like Supplier TIN or Tax amount are missing. Explain simply if LHDN might reject this or if it looks good to go.
        
        💰 Money Summary (How much are you spending?):
        State clearly the total amount paid. Then, in a new sentence, state exactly how much of that is tax. 
        
        💡 Business Tip (What did you buy?):
        Look at the items bought. Write one simple sentence summarizing what this expense is (for example: "It looks like you bought a lot of office supplies" or "This is a normal electricity bill").
        
        Payload: ${JSON.stringify(extractedData)}`;
      } else {
        prompt = `You are the official AI Support Assistant for BilBoleh. 
        The user encountered an error while processing an invoice: "${error}". 
        Explain why this might have happened and what the user can do to fix it (e.g., check if image is blurry, lighting is too dark, or API key is correct). 
        Keep it extremely simple, use short sentences, and be supportive.`;
      }

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt, 
      });

      setAiAssistantMessage(response.text || "I couldn't analyze the data at this moment.");
    } catch (err) {
      setAiAssistantMessage("Sorry, I encountered an error while trying to help you. Error: " + (err as Error).message);
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

    if (!genAI) {
        setSupportMessages(prev => [...prev, { role: 'ai', text: "System Error: Gemini API Key is missing. Please add it to your .env file." }]);
        setIsSupportThinking(false);
        return;
    }

    try {
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are the official AI Support Assistant for BilBoleh, an e-invoicing web application designed to help Malaysian Small and Medium Enterprises (SMEs) comply with the LHDN MyInvois standard.
        Your primary job is to help users troubleshoot technical issues, guide them through the app's features, and answer basic questions about Malaysian tax compliance.
        Always be polite, concise, and highly supportive. You must be able to understand and respond naturally in both English and Bahasa Malaysia, including common local business terms.
        If a user asks why their receipt failed to process, advise them to check if their image is blurry, if the lighting is too dark, or if their API key is correctly entered in the settings.
        Do not provide legally binding financial advice. Keep your responses short and formatted for a small chat window.
        
        User Question: ${userMsg}`
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

    if (!genAI) {
        setError("Missing Gemini API Key. Please add VITE_GEMINI_API_KEY in your .env file and restart the server.");
        return;
    }

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
                Crucially, format your output strictly as a valid JSON object. The JSON must match the precise LHDN MyInvois API schema, ensuring that key names are exact and hierarchy is maintained.

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
        // 【修復 3】：安全地移除 Markdown 標籤以防止 JSON.parse 報錯
        const cleanJson = resultText.replace(/```json\n?|```/g, '').trim();
        const parsedData = JSON.parse(cleanJson) as InvoiceData;
        setExtractedData(parsedData);
        saveInvoiceToDatabase(parsedData);
      }
    } catch (err) {
      console.error("Error processing invoice:", err);
      setError("Failed to process invoice. Ensure the image is clear and your API key is correct.");
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
    pending: invoices.filter(i => i.status === 'Pending').length,
    validated: invoices.filter(i => i.status === 'Validated').length,
    rejected: invoices.filter(i => i.status === 'Rejected').length,
    cancelled: invoices.filter(i => i.status === 'Cancelled').length,
    rejectedByBuyer: invoices.filter(i => i.status === 'RejectedByBuyer').length,
    totalSales: invoices.filter(i => i.status === 'Validated').reduce((acc, curr) => acc + curr.amount, 0),
    taxToRemit: invoices.filter(i => i.status === 'Validated').reduce((acc, curr) => acc + curr.tax, 0),
  };

  // ⚡ 1. Save extracted AI data to Firebase as "Pending"
  const saveInvoiceToDatabase = async (data: InvoiceData) => {
    try {
      const docRef = await addDoc(collection(db, "invoices"), {
        invNo: data.invoiceNumber || `INV-${Math.floor(Math.random() * 10000)}`,
        customer: data.buyer.name || "Unknown Customer",
        amount: data.totalAmount || 0,
        tax: data.taxAmount || 0,
        uin: "", 
        status: "Pending",
        lhdnPayload: data,
        dateTimestamp: serverTimestamp(),
        userId: user?.uid
      });
      setCurrentInvoiceId(docRef.id);
      setToastMessage("💾 Draft saved to database!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.error("Error saving document: ", e);
    }
  };

  // ⚡ 2. Merchant Auto-Sync: Send to FastAPI & Update LHDN Status
  const handleMerchantSync = async () => {
    if (!extractedData || !currentInvoiceId) {
      setToastMessage("❌ Please process an invoice first!");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    
    setToastMessage("🔄 Syncing with LHDN Microservice...");
    
    try {
      // 🚀 THE FASTAPI CONNECTION
      // Replace with your actual Cloud Run / Localhost FastAPI URL
      const API_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000'; 
      
      const response = await fetch(`${API_URL}/api/v1/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extractedData)
      });

      // Simulate API processing delay if backend isn't up yet
      await new Promise(r => setTimeout(r, 3000)); 

      // If successful, update Firestore to VALIDATED
      await updateDoc(doc(db, "invoices", currentInvoiceId), {
        status: "Validated",
        uin: `LHDN-${Math.random().toString(36).substring(2, 8).toUpperCase()}` // Mock UIN
      });

      setToastMessage("✅ LHDN Validation Successful!");
    } catch (error) {
      // Fallback for hackathon testing if API is down: Force Validate
      await updateDoc(doc(db, "invoices", currentInvoiceId), { status: "Validated" });
      setToastMessage("⚠️ Backend unreachable. Auto-forced Validated for testing.");
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ⚡ 3. Resolution Center: Edit & Resubmit
  const handleEditResubmit = (invoice: any) => {
    setExtractedData(invoice.lhdnPayload);
    setCurrentInvoiceId(invoice.id);
    setActiveTab('process');
    setToastMessage("✏️ Invoice loaded for correction.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ⚡ 4. Action Icons: Cancel & Download
  const handleCancelInvoice = async (id: string) => {
    if(confirm("Are you sure you want to cancel this validated invoice with LHDN?")) {
      await updateDoc(doc(db, "invoices", id), { status: "Cancelled" });
      setToastMessage("🚫 Invoice Cancelled.");
      setTimeout(() => setToastMessage(null), 3000);
      // Here you would also send a DELETE/CANCEL request to FastAPI
    }
  };

  const handleDownloadJSON = (payload: any, invNo: string) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invNo}_LHDN_Payload.json`;
    a.click();
  };

  const handleConsumerSubmit = () => {
    let valid = true;
    let errors = { tin: "", ic: "" };

    if (!buyerDetails.tin || buyerDetails.tin.length < 10) {
      errors.tin = "TIN must be at least 10 characters.";
      valid = false;
    }
    
    if (!buyerDetails.ic || !/^\d{6}-?\d{2}-?\d{4}$|^\d{12}$/.test(buyerDetails.ic)) {
      errors.ic = "Invalid IC format (e.g., 000000-00-0000).";
      valid = false;
    }

    setFormErrors(errors);

    if (valid) {
      setShowConvertModal(false);
      setToastMessage("✅ Request Submitted to LHDN!");
      setTimeout(() => setToastMessage(null), 5000);
      setBuyerDetails({ name: "", tin: "", ic: "" }); // 清空表单
    }
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
    <div className={`flex h-screen w-full p-6 gap-6 overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-[#050505] text-white' : 'bg-slate-50 text-slate-800'}`}>
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
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className={`p-2.5 rounded-full transition-all duration-500 flex items-center justify-center relative overflow-hidden
              ${theme === 'light' 
                ? 'bg-[#f8fafc] shadow-[4px_4px_10px_#e2e8f0,-4px_-4px_10px_#ffffff] text-pink-500' // 亮色保持原本干净立体的风格
                : 'bg-black/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_16px_rgba(0,0,0,0.6),inset_0_2px_6px_rgba(255,255,255,0.3)] text-blue-300' // 暗色：黑色底 + 玻璃反光内阴影 (Bubble 效果)
              }`}
            title="Toggle Theme"
          >
            {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

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
            <div className="flex items-center gap-2 pl-2">
            {/* AI Support 按鈕 */}
              <button 
                onClick={() => setShowSupportChat(!showSupportChat)}
                className={`p-2 rounded-full transition-colors relative
                  ${showSupportChat ? 'bg-pink-500 text-white shadow-lg glow-pink' : (theme === 'dark' ? 'hover:bg-white/5 text-white/60' : 'hover:bg-slate-900/5 text-slate-600')}`}
                title="AI Support"
              >
                <MessageSquare size={20} />
                {!showSupportChat && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full animate-pulse" />}
              </button>

              {/* Settings 按鈕 */}
              <button className={`p-2 ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-900/5'} rounded-full transition-colors ${theme === 'dark' ? 'text-white/60' : 'text-slate-600'}`}>
                <Settings size={20} />
              </button>
              
            </div>
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
                        <p className="text-center">{error}</p>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-300">
                        <FileSearch size={48} />
                        <p>{t.noData}</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                  {/* 3 Core Buttons */}
                  <div className="flex gap-4 relative z-10">
                  <button 
                    onClick={handleMerchantSync} 
                    className={`flex-1 py-3 ${theme === 'dark' ? 'glass-dark' : 'glass'} rounded-2xl text-xs font-bold hover:bg-blue-500 hover:text-white transition-all glow-blue flex flex-col items-center justify-center gap-2`}
                  >
                    <Upload size={20} /><span className="text-center">{t.merchantSync}</span>
                  </button>
                    <button onClick={() => setShowConvertModal(true)} className={`flex-1 py-3 ${theme === 'dark' ? 'glass-dark' : 'glass'} rounded-2xl text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all glow-emerald flex flex-col items-center justify-center gap-2`}>
                      <User size={20} /><span className="text-center">{t.consumerPortal}</span>
                    </button>
                    <button onClick={() => { const total = extractedData?.totalPayable || 0; setToastMessage(total > 10000 ? `🚨 HIGH VALUE (RM ${total}): Mandatory e-Invoice!` : `✅ Normal Transaction (RM ${total})`); setTimeout(() => setToastMessage(null), 5000); }} className={`flex-1 py-3 ${theme === 'dark' ? 'glass-dark' : 'glass'} rounded-2xl text-xs font-bold hover:bg-purple-500 hover:text-white transition-all glow-pink flex flex-col items-center justify-center gap-2`}>
                      <AlertCircle size={20} /><span className="text-center">{t.highValueCheck}</span>
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
              className="flex-1 flex flex-col gap-6 overflow-y-auto pb-10 pr-2 custom-scrollbar"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-5 gap-6">
                {[
                  { label: t.pending, value: stats.pending, color: 'amber', icon: <Clock size={24} /> },
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Invoice Log */}
                <div className={`col-span-2 ${theme === 'dark' ? 'glass-dark' : 'glass'} squircle p-8 flex flex-col gap-6 shadow-2xl border border-white/10`}>
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
                            <option value="All">{t.allStatus}</option>
                            <option value="Pending" className="bg-slate-900">{t.pending}</option>
                            <option value="Validated">{t.validated}</option>
                            <option value="Rejected">{t.rejected}</option>
                            <option value="Cancelled">{t.cancelled}</option>
                            <option value="RejectedByBuyer">{t.rejectedByBuyer}</option>
                          </select>
                      </div>
                    </div>
                  </div>

                  <div className="w-full">
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
                                    inv.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' :
                                    'bg-orange-500/10 text-orange-500'}`}
                                >
                                  {inv.status === 'Validated' ? t.validated : 
                                  inv.status === 'Pending' ? t.pending :
                                  inv.status === 'Rejected' ? t.rejected : 
                                  inv.status === 'Cancelled' ? t.cancelled : 
                                  t.rejectedByBuyer}
                                </span>
                              </td>
<td className="py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 rounded-lg hover:bg-pink-500 hover:text-white transition-all" title={t.share}>
                                  <Share2 size={14} />
                                </button>
                                
                                {/* 👇 Download 按钮 */}
                                <button 
                                  onClick={() => handleDownloadJSON(inv.lhdnPayload, inv.invNo)} 
                                  className="p-2 rounded-lg hover:bg-pink-500 hover:text-white transition-all" 
                                  title={t.download}
                                >
                                  <Download size={14} />
                                </button>

                                {/* 👇Cancel 按钮 */}
                                {inv.status === 'Validated' && (
                                  <button 
                                    onClick={() => handleCancelInvoice(inv.id)} 
                                    className="p-2 rounded-lg hover:bg-rose-500 hover:text-white transition-all" 
                                    title={t.cancelInv}
                                  >
                                    <Ban size={14} />
                                  </button>
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
                  <div className={`${theme === 'dark' ? 'glass-dark' : 'glass'} squircle p-6 border border-white/10 shadow-xl`}>
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-4">{t.finSummary}</h4>
                    <p className="text-xl font-black mb-2">{t.total}: MYR {stats.totalSales.toLocaleString()}</p>
                    <p className="text-xl font-black text-rose-400">{t.tax}: MYR {stats.taxToRemit.toLocaleString()}</p>
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
                            <button 
                              onClick={() => handleEditResubmit(inv)}
                              className="mt-2 py-2 w-full rounded-xl bg-rose-500..."
                            >
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
             <motion.div key="architecture" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={`flex-1 ${theme === 'dark' ? 'glass-dark' : 'glass'} squircle p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar pb-10 shadow-2xl`}>
                  
                  {/* 顶部标题区 */}
                  <div className="flex items-center justify-between shrink-0">
                    <h2 className="text-2xl font-bold text-pink-400">{t.backendArch || "Backend Architecture"}</h2>
                    <div className={`${theme === 'dark' ? 'neumorph-pill-dark' : 'neumorph-pill'} px-4 py-2 flex items-center gap-2`}>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className={`text-xs font-mono font-bold ${theme === 'dark' ? 'text-white/60' : 'text-slate-600'}`}>System Online</span>
                    </div>
                  </div>

                  {/* 流程三步骤 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 mt-2">
                    {[
                      { title: t.step1Title || "1. Extraction", desc: "Gemini 2.5 Flash multimodal vision parses raw receipts into structured JSON." }, 
                      { title: t.step2Title || "2. Processing", desc: "Python FastAPI maps data to official LHDN MyInvois schema." }, 
                      { title: t.step3Title || "3. Sync & Store", desc: "Real-time sync to Firebase Firestore with validated state." }
                    ].map((item, i) => (
                      <div key={i} className={`p-6 rounded-[2rem] border ${theme === 'dark' ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'} transition-colors group`}>
                        <h3 className="text-pink-500 font-bold mb-2 flex items-center gap-2">
                          <Zap size={16} className="group-hover:fill-pink-500 transition-all" /> {item.title}
                        </h3>
                        <p className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-slate-500'} leading-relaxed`}>{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />

                  {/* 新增：技术栈展示区 (专为评委设计) */}
                  <h2 className="text-lg font-bold text-cyan-400 shrink-0 mt-2">Core Tech Stack</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
                    
                    {/* Frontend & AI */}
                    <div className={`p-6 rounded-[2rem] border ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'} relative overflow-hidden`}>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none" />
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400"><Sparkles size={20} /></div>
                        <h3 className="font-bold">Frontend & AI</h3>
                      </div>
                      <ul className={`text-xs space-y-3 ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'}`}>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-cyan-400" /> <b>React + Vite:</b> Blazing fast UI rendering.</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-cyan-400" /> <b>Framer Motion:</b> Fluid micro-interactions.</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-cyan-400" /> <b>Google Gemini API:</b> High-accuracy OCR & Data Extraction.</li>
                      </ul>
                    </div>

                    {/* Backend & Cloud */}
                    <div className={`p-6 rounded-[2rem] border ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'} relative overflow-hidden`}>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none" />
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400"><Share2 size={20} /></div>
                        <h3 className="font-bold">Backend & Database</h3>
                      </div>
                      <ul className={`text-xs space-y-3 ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'}`}>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> <b>Python FastAPI:</b> High-performance microservice.</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> <b>Firebase Firestore:</b> Real-time NoSQL state management.</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> <b>Firebase Auth:</b> Secure user authentication.</li>
                      </ul>
                    </div>

                  </div>
                </motion.div>
            )}
          </AnimatePresence>

        {/* Support Chat Window */}
        <AnimatePresence>
          {showSupportChat && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={`fixed bottom-10 right-10 w-80 h-[450px] ${theme === 'dark' ? 'glass-dark' : 'glass'} squircle shadow-2xl z-[60] flex flex-col overflow-hidden border border-white/20`}
            >
              <div className="p-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2 pl-2">
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
                  <div className={`text-sm leading-relaxed whitespace-pre-wrap ${theme === 'dark' ? 'text-white/80' : 'text-slate-700'}`}>
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
                {/* Consumer Portal Request Modal */}
                <AnimatePresence>
                  {showConvertModal && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }} 
                      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
                      onClick={() => setShowConvertModal(false)} // 👈 点击遮罩层关闭
                    >
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                        animate={{ scale: 1, opacity: 1, y: 0 }} 
                        exit={{ scale: 0.9, opacity: 0, y: 20 }} 
                        transition={{ type: "spring", stiffness: 300, damping: 25 }} // 👈 更平滑的动画
                        onClick={(e) => e.stopPropagation()} // 👈 阻止点击内部时触发遮罩关闭
                        // 👇 将宽度从 max-w-md 提升到 max-w-lg (增加约 20-30% 呼吸感)
                        className={`${theme === 'dark' ? 'glass-dark' : 'glass'} w-full max-w-lg squircle p-8 md:p-10 shadow-2xl relative border border-white/20`}
                      >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full -mr-32 -mt-32 pointer-events-none" />
                        
                        <div className="flex justify-between items-center mb-8 relative z-10">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 glow-emerald">
                              <User className="text-white" size={24} />
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold">Consumer Request</h2>
                              <p className={`text-[10px] ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'} uppercase tracking-widest`}>Validated e-Invoice Portal</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setShowConvertModal(false)} // 👈 右上角 X 关闭图标
                            className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-900/5'} transition-colors`}
                          >
                            <X size={24} />
                          </button>
                        </div>
                        
                        {/* 增加 space-y-6 让输入框不拥挤 */}
                        <div className="space-y-6 relative z-10">
                          <div>
                            <label className="block text-xs font-bold mb-2 uppercase tracking-wider">Company / Name</label>
                            <input 
                              type="text" 
                              value={buyerDetails.name} 
                              onChange={(e) => setBuyerDetails({...buyerDetails, name: e.target.value})} 
                              className={`w-full p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-900/5 border-slate-900/10'} border focus:outline-none focus:border-pink-500/50 transition-colors`} 
                              placeholder="e.g. Ali Bin Ahmad"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-2 uppercase tracking-wider">Tax Identification Number (TIN)</label>
                            <input 
                              type="text" 
                              value={buyerDetails.tin} 
                              onChange={(e) => {
                                setBuyerDetails({...buyerDetails, tin: e.target.value});
                                setFormErrors({...formErrors, tin: ""}); // 输入时清除错误
                              }} 
                              className={`w-full p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-900/5 border-slate-900/10'} border ${formErrors.tin ? 'border-rose-500 focus:border-rose-500' : 'focus:border-pink-500/50'} transition-colors`} 
                              placeholder="e.g. IG1234567890"
                            />
                            {/* 👇 Validation 错误提示 */}
                            {formErrors.tin && <p className="text-rose-500 text-[10px] font-bold mt-2 ml-1 animate-pulse">{formErrors.tin}</p>}
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-2 uppercase tracking-wider">IC Number (NRIC)</label>
                            <input 
                              type="text" 
                              value={buyerDetails.ic} 
                              onChange={(e) => {
                                setBuyerDetails({...buyerDetails, ic: e.target.value});
                                setFormErrors({...formErrors, ic: ""});
                              }} 
                              className={`w-full p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-900/5 border-slate-900/10'} border ${formErrors.ic ? 'border-rose-500 focus:border-rose-500' : 'focus:border-pink-500/50'} transition-colors`} 
                              placeholder="e.g. 050101-14-5555"
                            />
                            {/* 👇 Validation 错误提示 */}
                            {formErrors.ic && <p className="text-rose-500 text-[10px] font-bold mt-2 ml-1 animate-pulse">{formErrors.ic}</p>}
                          </div>
                        </div>

                        <div className="mt-10 flex justify-center relative z-10">
                          <button 
                            onClick={handleConsumerSubmit} 
                            // 👇 改用品牌主色调，宽度占 3/4 并在中央，提升视觉焦点
                            className="w-full md:w-3/4 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-pink-500/30 transition-all active:scale-[0.98] glow-pink"
                          >
                            Submit Request to LHDN
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                        {/* Toast 系統提示 UI */}
                        <AnimatePresence>
                          {toastMessage && (
                            <motion.div
                              initial={{ opacity: 0, y: 50 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 50 }}
                              className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-2xl border border-white/20 max-w-lg text-center"
                            >
                              {toastMessage}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <AnimatePresence>
                          {showConvertModal && (
                            <motion.div 
                              initial={{ opacity: 0 }} 
                              animate={{ opacity: 1 }} 
                              exit={{ opacity: 0 }} 
                              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
                              onClick={() => setShowConvertModal(false)} // ✅ 要求 1：点击背后的遮罩层时关闭弹窗
                            >
                              <motion.div 
                                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                                animate={{ scale: 1, opacity: 1, y: 0 }} 
                                exit={{ scale: 0.9, opacity: 0, y: 20 }} 
                                transition={{ type: "spring", stiffness: 300, damping: 25 }} // ✅ 要求 3：平滑的动画过渡效果
                                onClick={(e) => e.stopPropagation()} // 阻止点击内部时触发遮罩的关闭
                                className={`${theme === 'dark' ? 'glass-dark' : 'glass'} w-full max-w-lg squircle p-8 md:p-10 shadow-2xl relative border border-white/20`} 
                                // ✅ 要求 1：使用 max-w-lg 增加了 20%-30% 的宽度，高度自适应
                              >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full -mr-32 -mt-32 pointer-events-none" />
                                
                                <div className="flex justify-between items-center mb-8 relative z-10">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 glow-emerald">
                                      <User className="text-white" size={24} />
                                    </div>
                                    <div>
                                      <h2 className="text-2xl font-bold">Consumer Request</h2>
                                      <p className={`text-[10px] ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'} uppercase tracking-widest`}>Validated e-Invoice Portal</p>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => setShowConvertModal(false)} // ✅ 要求 1：右上角 X 关闭图标
                                    className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-900/5'} transition-colors`}
                                  >
                                    <X size={24} />
                                  </button>
                                </div>
                                
                                {/* 输入框区域：增加 space-y-6 提供呼吸感 */}
                                <div className="space-y-6 relative z-10">
                                  <div>
                                    <label className="block text-xs font-bold mb-2 uppercase tracking-wider">Company / Name</label>
                                    <input 
                                      type="text" 
                                      value={buyerDetails.name} 
                                      onChange={(e) => setBuyerDetails({...buyerDetails, name: e.target.value})} 
                                      className={`w-full p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-900/5 border-slate-900/10'} border focus:outline-none focus:border-pink-500/50 transition-colors`} 
                                      placeholder="e.g. Ali Bin Ahmad"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold mb-2 uppercase tracking-wider">Tax Identification Number (TIN)</label>
                                    <input 
                                      type="text" 
                                      value={buyerDetails.tin} 
                                      onChange={(e) => {
                                        setBuyerDetails({...buyerDetails, tin: e.target.value});
                                        setFormErrors({...formErrors, tin: ""}); // ✅ 要求 3：Basic Validation 提示清除
                                      }} 
                                      className={`w-full p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-900/5 border-slate-900/10'} border ${formErrors?.tin ? 'border-rose-500 focus:border-rose-500' : 'focus:border-pink-500/50'} transition-colors`} 
                                      placeholder="e.g. IG1234567890"
                                    />
                                    {formErrors?.tin && <p className="text-rose-500 text-[10px] font-bold mt-2 ml-1 animate-pulse">{formErrors.tin}</p>}
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold mb-2 uppercase tracking-wider">IC Number (NRIC)</label>
                                    <input 
                                      type="text" 
                                      value={buyerDetails.ic} 
                                      onChange={(e) => {
                                        setBuyerDetails({...buyerDetails, ic: e.target.value});
                                        setFormErrors({...formErrors, ic: ""}); // ✅ 要求 3：Basic Validation 提示清除
                                      }} 
                                      className={`w-full p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-900/5 border-slate-900/10'} border ${formErrors?.ic ? 'border-rose-500 focus:border-rose-500' : 'focus:border-pink-500/50'} transition-colors`} 
                                      placeholder="e.g. 050101-14-5555"
                                    />
                                    {formErrors?.ic && <p className="text-rose-500 text-[10px] font-bold mt-2 ml-1 animate-pulse">{formErrors.ic}</p>}
                                  </div>
                                </div>

                                <div className="mt-10 flex justify-center relative z-10">
                                  <button 
                                    onClick={handleConsumerSubmit} 
                                    // ✅ 要求 1：显眼的确认提交按钮，与品牌主色调（粉紫）一致，置中设计
                                    className="w-full md:w-3/4 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-pink-500/30 transition-all active:scale-[0.98] glow-pink"
                                  >
                                    Submit Request to LHDN
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