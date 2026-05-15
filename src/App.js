import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, Wrench, Zap, Droplets, Paintbrush, Sparkles, 
  History, PlusCircle, CheckCircle, XCircle, AlertTriangle, 
  User, Mail, MapPin, Calendar, FileText, Printer, Check, X, Search, 
  Users, Phone, Building, ShieldCheck, UserCog, CreditCard, Fan, 
  CalendarDays, Clock, Bell, Edit, ArrowRight, LogOut, LayoutDashboard,
  PackageOpen, Timer, Lamp, DoorOpen, HardHat, Briefcase, Cpu, Activity, Info
} from 'lucide-react';
import compressImage from './utils/imageCompression';
import { auth, db, storage } from './firebase';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';

import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  arrayUnion
} from 'firebase/firestore';

import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';


// --- FILTRO DE PALAVRÕES (PROFANITY FILTER) ---
const PROFANITY_LIST = [
  'porra', 'caralho', 'buceta', 'fuder', 'foder', 'merda', 'puta', 
  'viado', 'corno', 'arrombado', 'cuzao', 'kct', 'cacete', 'fdp', 
  'vsf', 'vtnc', 'bosta', 'caceta', 'desgraca', 'piranha', 'safada', 
  'cadela', 'boceta', 'siririca', 'piroca', 'pica', 'rola', 'carai'
];

function checkProfanity(texts) {
  if (!texts || !Array.isArray(texts)) return false;
  const combined = texts.filter(t => typeof t === 'string').join(' ').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return PROFANITY_LIST.some(bad => {
    const regex = new RegExp(`\\b${bad}\\b`, 'i');
    return regex.test(combined);
  });
}

// --- OPÇÕES PADRÃO DE AUTOCOMPLETAR E PESQUISA ---
const TASK_OPTIONS_MANUTENCAO = [
  'Ar Condicionado (Evaporadora/Condensadora)',
  'Cabine Primária / Quadros Elétricos',
  'Caixas Acopladas',
  'Chiller / Sistemas de Automação',
  'Cubas e Pias',
  'Duchas Higiênicas',
  'Fechaduras',
  'Forro e Teto',
  'Iluminação (Luminárias/Lâmpadas/Leds)',
  'Interruptores e Tomadas',
  'Janelas e Vidros',
  'Mictórios',
  'Mobiliário (Mesas/Armários)',
  'Paredes (Alvenaria/Drywall)',
  'Pintura Geral / Reparos',
  'Piso Elevado / Passagem Elétrica',
  'Pisos e Rodapés',
  'Portão Elétrico',
  'Portas',
  'Ralos e Sifões',
  'Registros e Válvulas',
  'Sistema de Entrada (Leitor Facial)',
  'Sistema de Exaustão',
  'Sistema Trifásico de Motor',
  'Torneiras',
  'Vasos Sanitários'
].map(t => t.toUpperCase());

const TASK_OPTIONS_LIMPEZA = [
  'Aspirar salas e carpetes',
  'Higienização de banheiros',
  'Limpeza básica de copa e áreas comuns',
  'Limpeza de mesas e estações de trabalho',
  'Limpeza de vidros, divisórias e janelas',
  'Passar pano úmido em pisos frios',
  'Remoção de lixo e troca de refis',
  'Remoção de pó em locais altos',
  'Reposição de insumos (Papel/Sabonete)'
].map(t => t.toUpperCase());

const LOCATION_OPTIONS = [
  'Recepção',
  'Sala Principal',
  'Sala de Reunião',
  'Copa / Cozinha',
  'Banheiro Masculino',
  'Banheiro Feminino',
  'Banheiro PCD',
  'Corredor / Áreas Comuns',
  'Casa de Máquinas / TI',
  'Área Externa',
  'Estacionamento',
  'Geral (Toda a Unidade)'
].map(l => l.toUpperCase());

const DEFAULT_CONTRACT = {
  hasManutencao: true,
  hasLimpeza: false,
  preventiva: { total: 1, used: 0 }, 
  emergencial: { total: 2, used: 0 },
  limpezaDays: 5,
  description: ''
};

const AutocompleteInput = ({ value, onChange, options, placeholder, label, required = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState(options);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    setFiltered(options.filter(o => o.toLowerCase().includes((value || '').toLowerCase())));
  }, [value, options]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);
    setIsOpen(true);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label className="block text-xs font-semibold text-[#2F2F2F] mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          required={required}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full p-2.5 pr-8 rounded-lg border border-zinc-300 text-sm outline-none focus:border-orange-500 text-zinc-800 bg-white"
        />
        <Search size={16} className="absolute right-3 top-3 text-zinc-400 pointer-events-none" />
      </div>
      
      {isOpen && (
        <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-xl top-full left-0">
          {filtered.length > 0 ? (
            filtered.map((opt, i) => (
              <li
                key={i}
                className="px-4 py-2.5 text-sm text-zinc-700 hover:bg-orange-50 hover:text-orange-700 cursor-pointer border-b border-zinc-50 last:border-0"
                onClick={() => { onChange(opt); setIsOpen(false); }}
              >
                {opt}
              </li>
            ))
          ) : (
            <div className="p-3 text-xs text-zinc-500">
              <span className="font-semibold text-orange-600">"{value}"</span> será salvo para todos os técnicos.
            </div>
          )}
        </ul>
      )}
    </div>
  );
};

function getClientQuotaHealth(contract, type) {
  if(!contract || !contract[type]) return { color: 'bg-zinc-100 text-zinc-500', text: '0/0' };
  const { total, used } = contract[type]; 
  if (total === 0) return { color: 'bg-zinc-100 text-zinc-400', text: 'N/A' };
  const remaining = total - used; 
  if (remaining <= 0) return { color: 'bg-red-100 text-red-700', text: `${used}/${total} (Limite)` };
  return { color: 'bg-green-100 text-green-700', text: `${used}/${total} (OK)` };
}

function getRepairsCount(order) {
  if (order.checklistItems) return order.checklistItems.filter(i => i.status === 'repair').length;
  if (order.checklists) return Object.values(order.checklists).flat().filter(i => i.status === 'repair').length;
  return 0;
}

const SignaturePad = ({ onSave, onClear, signatureRef }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const initCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect(); if (rect.width === 0) return;
    canvas.width = rect.width * 2; canvas.height = rect.height * 2;
    const ctx = canvas.getContext('2d'); ctx.scale(2, 2);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#2F2F2F';
  };
  useEffect(() => { setTimeout(initCanvas, 100); window.addEventListener('resize', initCanvas); return () => window.removeEventListener('resize', initCanvas); }, []);
  const startDrawing = (e) => { e.preventDefault(); const canvas = canvasRef.current; canvas.setPointerCapture(e.pointerId); const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; const ctx = canvas.getContext('2d'); ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true); };
  const draw = (e) => { e.preventDefault(); if (!isDrawing) return; const canvas = canvasRef.current; const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; const ctx = canvas.getContext('2d'); ctx.lineTo(x, y); ctx.stroke(); };
  const stopDrawing = (e) => { if (!isDrawing) return; setIsDrawing(false); const canvas = canvasRef.current; canvas.releasePointerCapture(e.pointerId); if (onSave) onSave(canvas.toDataURL('image/png')); };
  const clearCanvas = () => { const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); if (onClear) onClear(); if (onSave) onSave(null); };
  useEffect(() => { if (signatureRef) signatureRef.current = { clear: clearCanvas }; }, [signatureRef]);
  return (
    <div className="flex flex-col items-center w-full">
      <div className="border border-zinc-300 rounded-lg overflow-hidden w-full max-w-lg bg-zinc-50 touch-none shadow-sm">
        <canvas ref={canvasRef} className="w-full h-48 cursor-crosshair touch-none" style={{ touchAction: 'none' }} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} />
      </div>
      <button type="button" onClick={clearCanvas} className="mt-2 text-sm text-zinc-500 hover:text-red-500 flex items-center transition-colors font-medium"><X size={16} className="mr-1"/> Limpar Assinatura</button>
    </div>
  );
};

const appId = 'manutecos-default-app';

const ADMIN_EMAILS = [
  'limapris@gmail.com',
  'sam.mendescostas@gmail.com'
];

const getUserRoleSafe = (email) => {
  if (!email) return 'tecnico';

  const lower = email.toLowerCase();

  if (ADMIN_EMAILS.includes(lower)) {
    return 'gestor';
  }

  return 'tecnico';
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState('todas');
  const isAdmin = ADMIN_EMAILS.includes(
  user?.email?.toLowerCase()
);
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [notification, setNotification] = useState(null);

  const [userRole, setUserRole] = useState('gestor'); 

  const [currentView, setCurrentView] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);

  const [showAddTechForm, setShowAddTechForm] = useState(false);
  const [newTechData, setNewTechData] = useState({ name: '', type: 'PF', document: '', phone: '', email: '', specialty: 'Manutenção' });
  const [showAddClientForm, setShowAddClientForm] = useState(false);
  const [showInactiveClients, setShowInactiveClients] = useState(false);
  const [newClientEntry, setNewClientEntry] = useState({ name: '', email: '', address: '', cnpj: '', phone: '', responsible: '', contract: DEFAULT_CONTRACT });

  const [showContractModal, setShowContractModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [contractData, setContractData] = useState(DEFAULT_CONTRACT);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ clientId: '', date: '', time: '', visitType: 'preventiva', technicianId: '', notes: '', scheduledItems: [{ id: Date.now().toString(), task: '', location: '' }] });

  const [osType, setOsType] = useState('manutencao'); 
  const [visitType, setVisitType] = useState('preventiva');
  const [selectedTechId, setSelectedTechId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientData, setClientData] = useState({ name: '', email: '', address: '', cnpj: '', phone: '', responsible: '', date: new Date().toISOString().split('T')[0] });
  
  const [dynamicTasksManutencao, setDynamicTasksManutencao] = useState(TASK_OPTIONS_MANUTENCAO);
  const [dynamicTasksLimpeza, setDynamicTasksLimpeza] = useState(TASK_OPTIONS_LIMPEZA);
  const [dynamicLocations, setDynamicLocations] = useState(LOCATION_OPTIONS);

  const [checklistItems, setChecklistItems] = useState([
  {
    id: Date.now().toString(),
    task: '',
    location: '',
    status: 'pending',
    notes: '',
    dayOfWeek: '',
    photos: []
  }
]);
  
  const [observations, setObservations] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [signatureData, setSignatureData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveOSDraft = () => {
  try {
    sessionStorage.setItem('manutec_os_draft', JSON.stringify({
      currentView,
      selectedOrder,
      editingOrder,
      osType,
      visitType,
      selectedTechId,
      selectedClientId,
      clientData,
      checklistItems,
      observations,
      materialsUsed,
      signatureData
    }));
  } catch (error) {
    console.error('Erro ao salvar rascunho da OS:', error);
  }
};
   
  const [avulsaPrice, setAvulsaPrice] = useState('');
  const [avulsaApproved, setAvulsaApproved] = useState(false);
  const [avulsaStatus, setAvulsaStatus] = useState('executado');
  const [needsFollowUp, setNeedsFollowUp] = useState(false);
  
  const signatureRef = useRef(null);

  const notify = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setLoading(false);

    if (currentUser) {
      setIsAppUnlocked(true);

      const role = getUserRoleSafe(currentUser.email);
      setUserRole(role);

      if (role === 'gestor') {
        setCurrentView('dashboard');
      } else {
        setCurrentView('agenda');
      }
    }
  });

  return () => unsubscribe();
}, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubOrders = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'service_orders'), (snap) => {
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); fetched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); setOrders(fetched);
    });
    const unsubClients = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), (snap) => {
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); fetched.sort((a, b) => a.name.localeCompare(b.name)); setClients(fetched);
    });
    const unsubTechs = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'technicians'), (snap) => {
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); fetched.sort((a, b) => a.name.localeCompare(b.name)); setTechnicians(fetched);
    });
    const unsubSchedules = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'schedules'), (snap) => {
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); fetched.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`)); setSchedules(fetched);
    });
    
    const unsubOptions = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'options', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.tasksManutencao) setDynamicTasksManutencao([...new Set([...TASK_OPTIONS_MANUTENCAO, ...data.tasksManutencao.map(t => t.toUpperCase())])].sort());
        if (data.tasksLimpeza) setDynamicTasksLimpeza([...new Set([...TASK_OPTIONS_LIMPEZA, ...data.tasksLimpeza.map(t => t.toUpperCase())])].sort());
        if (data.locations) setDynamicLocations([...new Set([...LOCATION_OPTIONS, ...data.locations.map(l => l.toUpperCase())])].sort());
      }
    });

    return () => { unsubOrders(); unsubClients(); unsubTechs(); unsubSchedules(); unsubOptions(); };
  }, [user]);

  const handleAuthSubmit = async (e) => {
  e.preventDefault();
  setIsAuthenticating(true);
  setAuthError('');

  try {
    if (!authEmail || !authPassword) {
      throw new Error('Preencha e-mail e senha.');
    }

    if (authPassword.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }

    if (isLoginMode) {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
    } else {
      await createUserWithEmailAndPassword(auth, authEmail, authPassword);
    }

    setIsAppUnlocked(true);
  } catch (error) {
    console.error('Erro no login/cadastro:', error);

    if (error.code === 'auth/email-already-in-use') {
      setAuthError('Este e-mail já está cadastrado. Clique em "Já sou cadastrado".');
    } else if (error.code === 'auth/invalid-email') {
      setAuthError('E-mail inválido.');
    } else if (error.code === 'auth/invalid-credential') {
      setAuthError('E-mail ou senha incorretos.');
    } else if (error.code === 'auth/user-not-found') {
      setAuthError('Usuário não encontrado. Faça o cadastro primeiro.');
    } else if (error.code === 'auth/wrong-password') {
      setAuthError('Senha incorreta.');
    } else if (error.code === 'auth/weak-password') {
      setAuthError('Senha muito fraca. Use pelo menos 6 caracteres.');
    } else {
      setAuthError(error.message || 'Erro ao autenticar.');
    }
  } finally {
    setIsAuthenticating(false);
  }
};

    const handleLogout = async () => {
  if (!window.confirm("Deseja realmente sair do sistema?")) return;

  try {
    await signOut(auth); // 🔥 ESSENCIAL

    // limpa estados locais
    setIsAppUnlocked(false);
    setAuthEmail('');
    setAuthPassword('');
    setAuthCode('');
    setUserRole('gestor');
    setCurrentView('dashboard');

  } catch (error) {
    console.error("Erro ao sair:", error);
    notify("Erro ao sair do sistema", "error");
  }
};

  const handleAddChecklistItem = () => {
    setChecklistItems([...checklistItems, { id: Date.now().toString() + Math.random(), task: '', location: '', status: 'pending', notes: '', dayOfWeek: '' }]);
  };

  const handleRemoveChecklistItem = (idToRemove) => {
    setChecklistItems(checklistItems.filter(item => item.id !== idToRemove));
  };

  const handleUpdateChecklistItem = (id, field, value) => {
    let finalValue = value;
    if (field === 'task' || field === 'location') {
      finalValue = value.toUpperCase(); 
    }
    setChecklistItems(checklistItems.map(item => item.id === id ? { ...item, [field]: finalValue } : item));
  };
const handleChecklistPhoto = async (id, file) => {
  if (!file) return;

  try {
    const fileName = `${Date.now()}-${file.name}`;

    const storageRef = ref(storage, `checklists/${fileName}`);

    await uploadBytes(storageRef, file);

    const downloadURL = await getDownloadURL(storageRef);

    setChecklistItems(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              photos: [...(item.photos || []), downloadURL]
            }
          : item
      )
    );

    notify('Foto enviada com sucesso.', 'success');

  } catch (error) {
    console.error(error);
    notify('Erro ao enviar foto.', 'error');
  }
};

  const handleAddScheduleItem = () => {
    setNewSchedule({...newSchedule, scheduledItems: [...newSchedule.scheduledItems, { id: Date.now().toString() + Math.random(), task: '', location: '' }]});
  };

  const handleRemoveScheduleItem = (id) => {
    setNewSchedule({...newSchedule, scheduledItems: newSchedule.scheduledItems.filter(item => item.id !== id)});
  };

  const handleUpdateScheduleItem = (id, field, value) => {
    let finalValue = value;
    if (field === 'task' || field === 'location') {
      finalValue = value.toUpperCase(); 
    }
    setNewSchedule({...newSchedule, scheduledItems: newSchedule.scheduledItems.map(item => item.id === id ? { ...item, [field]: finalValue } : item)});
  };

  const handleSaveTechnician = async (e) => {
    e.preventDefault(); if (!newTechData.name) return; 
    if (checkProfanity(Object.values(newTechData))) { notify("Linguagem ofensiva detectada. Ajuste o texto.", "error"); return; }
    setIsSubmitting(true);
    try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'technicians'), { ...newTechData, createdAt: new Date().toISOString() }); setShowAddTechForm(false); setNewTechData({ name: '', type: 'PF', document: '', phone: '', email: '', specialty: 'Manutenção' }); notify("Colaborador cadastrado!", "success"); } 
    catch (err) { notify("Erro ao salvar.", "error"); } finally { setIsSubmitting(false); }
  };

  const handleSaveClientManual = async (e) => {
    e.preventDefault(); if (!newClientEntry.name) return; 
    const allTexts = [...Object.values(newClientEntry).filter(v => typeof v === 'string'), newClientEntry.contract?.description];
    if (checkProfanity(allTexts)) { notify("Linguagem ofensiva detectada. Ajuste o texto.", "error"); return; }
    setIsSubmitting(true);
    try { 
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), { ...newClientEntry, createdAt: new Date().toISOString() }); 
      setShowAddClientForm(false); 
      setNewClientEntry({ name: '', email: '', address: '', cnpj: '', phone: '', responsible: '', contract: DEFAULT_CONTRACT }); 
      notify("Unidade cliente cadastrada com sucesso!", "success"); 
    } 
    catch (err) { notify("Erro ao salvar cliente.", "error"); } finally { setIsSubmitting(false); }
  };

  const handleUpdateContract = async (e) => {
    e.preventDefault(); if (!editingClient) return; 
    if (checkProfanity([contractData.description])) { notify("Linguagem ofensiva detectada. Ajuste o texto.", "error"); return; }
    setIsSubmitting(true);
    try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', editingClient.id), { contract: contractData }); setShowContractModal(false); setEditingClient(null); notify("Configuração de contrato atualizada!", "success"); } 
    catch (err) { notify("Erro ao atualizar contrato.", "error"); } finally { setIsSubmitting(false); }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault(); 
    if (!newSchedule.clientId || !newSchedule.date || !newSchedule.time || (userRole !== 'cliente' && !newSchedule.technicianId)) { 
      notify("Preencha todos os campos obrigatórios.", "error"); 
      return; 
    }
    const allTextsToCheck = [newSchedule.notes, ...newSchedule.scheduledItems.map(i => `${i.task} ${i.location}`)];
    if (checkProfanity(allTextsToCheck)) { notify("Linguagem ofensiva detectada na descrição. Ajuste o texto.", "error"); return; }
    setIsSubmitting(true);
    try { 
      const clientRecord = clients.find(c => c.id === newSchedule.clientId);
      const techRecord = technicians.find(t => t.id === newSchedule.technicianId);
      const validScheduledItems = newSchedule.scheduledItems.filter(i => i.task.trim() !== '' || i.location.trim() !== '');
      const scheduleRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'schedules'), { 
        clientId: newSchedule.clientId,
        date: newSchedule.date,
        time: newSchedule.time,
        visitType: newSchedule.visitType,
        technicianId: newSchedule.technicianId || 'A definir',
        notes: newSchedule.notes,
        scheduledItems: validScheduledItems,
        status: 'Agendado', 
        createdAt: new Date().toISOString() 
      }); 

      if (clientRecord && clientRecord.email) {
        try {
          let itemsHtml = '';
          if (validScheduledItems.length > 0) {
            itemsHtml = validScheduledItems.map(item => `<li style="margin-bottom: 4px;"><strong>Serviço:</strong> ${item.task || 'Geral'} | <strong>Local:</strong> ${item.location || 'Não especificado'}</li>`).join('');
          }
          const clientHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2F2F2F; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              <h2 style="color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 10px;">Manutec - Confirmação de Agendamento</h2>
              <p>Olá, <strong>${clientRecord.responsible || clientRecord.name}</strong>,</p>
              <p>Uma nova visita técnica foi agendada para a sua unidade.</p>
              <div style="background-color: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ea580c;">
                <p style="margin: 0 0 8px 0;"><strong>Data:</strong> ${new Date(newSchedule.date + "T12:00:00").toLocaleDateString('pt-BR')}</p>
                <p style="margin: 0 0 8px 0;"><strong>Horário Previsto:</strong> ${newSchedule.time}</p>
                <p style="margin: 0 0 8px 0;"><strong>Técnico Responsável:</strong> ${techRecord ? techRecord.name : 'A definir pela Manutec'}</p>
                <p style="margin: 0;"><strong>Tipo de Visita:</strong> ${newSchedule.visitType.replace('_', ' ').toUpperCase()}</p>
              </div>
              ${validScheduledItems.length > 0 || newSchedule.notes ? `
              <h3 style="color: #2F2F2F; font-size: 16px;">Pré-diagnóstico / Solicitação:</h3>
              <ul style="padding-left: 20px; font-size: 14px;">
                ${itemsHtml}
                ${newSchedule.notes ? `<li><strong>Observações:</strong> ${newSchedule.notes}</li>` : ''}
              </ul>` : ''}
              <p style="margin-top: 30px; font-size: 12px; color: #9ca3af;">Este é um e-mail automático gerado pelo sistema ManutecOS.</p>
            </div>
          `;
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'mail'), {
            to: clientRecord.email,
            message: { subject: `Agendamento Confirmado: ${new Date(newSchedule.date + "T12:00:00").toLocaleDateString('pt-BR')} - Manutec`, html: clientHtml },
            createdAt: new Date().toISOString()
          });
        } catch (emailErr) { console.error("Erro e-mail cliente:", emailErr); }
      }

      if (techRecord && techRecord.email) {
        try {
          let itemsHtml = '';
          if (validScheduledItems.length > 0) {
            itemsHtml = validScheduledItems.map(item => `<li style="margin-bottom: 4px;"><strong>Serviço:</strong> ${item.task || 'Geral'} | <strong>Local:</strong> ${item.location || 'Não especificado'}</li>`).join('');
          }
          const techHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2F2F2F; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              <h2 style="color: #2F2F2F; border-bottom: 2px solid #2F2F2F; padding-bottom: 10px;">Nova OS Agendada - Manutec</h2>
              <p>Olá, <strong>${techRecord.name}</strong>,</p>
              <p>Você tem um novo atendimento técnico agendado.</p>
              <div style="background-color: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2F2F2F;">
                <p style="margin: 0 0 8px 0;"><strong>Cliente:</strong> ${clientRecord ? clientRecord.name : 'N/A'}</p>
                <p style="margin: 0 0 8px 0;"><strong>Endereço:</strong> ${clientRecord ? clientRecord.address : 'N/A'}</p>
                <p style="margin: 0 0 8px 0;"><strong>Data:</strong> ${new Date(newSchedule.date + "T12:00:00").toLocaleDateString('pt-BR')}</p>
                <p style="margin: 0 0 8px 0;"><strong>Horário Previsto:</strong> ${newSchedule.time}</p>
                <p style="margin: 0;"><strong>Tipo de Visita:</strong> ${newSchedule.visitType.replace('_', ' ').toUpperCase()}</p>
              </div>
              ${validScheduledItems.length > 0 || newSchedule.notes ? `
              <h3 style="color: #2F2F2F; font-size: 16px;">Detalhes do Chamado:</h3>
              <ul style="padding-left: 20px; font-size: 14px;">
                ${itemsHtml}
                ${newSchedule.notes ? `<li><strong>Observações do Cliente:</strong> ${newSchedule.notes}</li>` : ''}
              </ul>` : ''}
              <p style="margin-top: 30px; font-size: 12px; color: #9ca3af;">Acesse o painel do ManutecOS para efetuar a baixa desta OS.</p>
            </div>
          `;
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'mail'), {
            to: techRecord.email,
            message: { subject: `Novo Agendamento: ${clientRecord?.name} - Manutec`, html: techHtml },
            createdAt: new Date().toISOString()
          });
        } catch (emailErr) { console.error("Erro e-mail técnico:", emailErr); }
      }
      setShowScheduleModal(false); 
      setNewSchedule({ clientId: '', date: '', time: '', visitType: 'preventiva', technicianId: '', notes: '', scheduledItems: [{ id: Date.now().toString(), task: '', location: '' }] }); 
      notify("Visita agendada com sucesso!", "success"); 
      if (userRole === 'cliente') { setCurrentView('agenda'); }
    } 
    catch (err) { notify("Erro ao agendar.", "error"); } finally { setIsSubmitting(false); }
  };

  const handleSaveOS = async (e) => {
    e.preventDefault();
    const loggedTech = technicians.find(
  t => t.email?.toLowerCase() === user?.email?.toLowerCase()
);

const techId = userRole === 'tecnico'
  ? loggedTech?.id
  : selectedTechId;
  
    if (!clientData.name || !signatureData || !techId) { notify("Selecione o Cliente, Técnico e adicione Assinatura.", "error"); return; }
    if (!selectedClientId) { notify("Selecione um cliente válido da lista.", "error"); return; }
    const validChecklistItems = checklistItems
  .filter(item => item.task.trim() !== '')
  .map(item => ({
    ...item,
    photo: null,
    photos: Array.isArray(item.photos) ? item.photos : []
  }));
    if (validChecklistItems.length === 0) { notify("Preencha pelo menos um item no Checklist.", "error"); return; }
    const allTextsToCheck = [
      observations, materialsUsed, avulsaPrice, clientData.name, clientData.address, clientData.responsible,
      ...validChecklistItems.map(i => `${i.task} ${i.location} ${i.notes}`)
    ];
    if (checkProfanity(allTextsToCheck)) { notify("Linguagem ofensiva detectada na Vistoria. Remova palavras de baixo calão antes de enviar.", "error"); return; }
    const finalVisitType = osType === 'limpeza' ? 'diaria_limpeza' : visitType;
    let clientRecord = clients.find(c => c.id === selectedClientId);
    setIsSubmitting(true);
    try {
      if (finalVisitType !== 'avulsa' && finalVisitType !== 'diaria_limpeza' && clientRecord) {
         const updatedContract = { ...(clientRecord.contract || DEFAULT_CONTRACT) };
         if (!updatedContract[finalVisitType]) updatedContract[finalVisitType] = { total: 0, used: 0 };
         updatedContract[finalVisitType].used += 1;
         await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', selectedClientId), { contract: updatedContract });
      }
      const selectedTech = technicians.find(t => t.id === techId);
      const isEditing = !!editingOrder;
      const osData = {
  osType,
  visitType: finalVisitType,
  technicianId: techId,
  technician: selectedTech ? selectedTech.name : (loggedTech?.name || 'N/A'),
  clientId: selectedClientId,
  client: clientData,
  checklistItems: validChecklistItems,
  observations,
  materialsUsed,
  signature: signatureData,
  updatedAt: new Date().toISOString(),
  status: isEditing ? 'Concluída' : (needsFollowUp ? 'Pendente' : 'Concluída'),
  needsFollowUp,
  ...(finalVisitType === 'avulsa'
    ? { avulsaPrice, avulsaApproved, avulsaStatus: avulsaApproved ? avulsaStatus : '' }
    : {})
};

let newOsRef;

if (isEditing) {
  await updateDoc(
    doc(db, 'artifacts', appId, 'public', 'data', 'service_orders', editingOrder.id),
    osData
  );
  newOsRef = { id: editingOrder.id };
} else {
  newOsRef = await addDoc(
    collection(db, 'artifacts', appId, 'public', 'data', 'service_orders'),
    {
      ...osData,
      createdAt: new Date().toISOString()
    }
  );
}
      if (clientData.email) {
        try {
          const itemsHtml = validChecklistItems.map(item => 
            `<li style="margin-bottom: 8px;"><strong>${item.task}</strong> (${item.location})${item.dayOfWeek ? ` - <em>${item.dayOfWeek}</em>` : ''}: ${
              osType === 'limpeza' 
                ? (item.status === 'ok' ? '<span style="color: green;">Realizado</span>' : item.status === 'repair' ? '<span style="color: red;">Não Realizado</span>' : 'Pendente')
                : (item.status === 'ok' ? '<span style="color: green;">Conforme</span>' : item.status === 'repair' ? '<span style="color: red;">Reparo Necessário</span>' : 'N/A')
            } ${item.notes ? `<br/><em style="color: #666; font-size: 12px;">Apontamento: ${item.notes}</em>` : ''}</li>`
          ).join('');
          const emailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2F2F2F; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              <h2 style="color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 10px;">Manutec - Soluções em Manutenção</h2>
              <p>Olá, <strong>${clientData.responsible || clientData.name}</strong>,</p>
              <p>Informamos que o atendimento técnico na unidade <strong>${clientData.name}</strong> foi finalizado.</p>
              <div style="background-color: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2F2F2F;">
                <p style="margin: 0 0 8px 0;"><strong>Código do Laudo:</strong> #${newOsRef.id.slice(0,8).toUpperCase()}</p>
                <p style="margin: 0 0 8px 0;"><strong>Data:</strong> ${new Date(clientData.date + "T12:00:00").toLocaleDateString('pt-BR')}</p>
                <p style="margin: 0 0 8px 0;"><strong>Técnico Responsável:</strong> ${selectedTech ? selectedTech.name : 'N/A'}</p>
                <p style="margin: 0;"><strong>Tipo de Serviço:</strong> ${finalVisitType.replace('_', ' ').toUpperCase()}</p>
              </div>
              ${finalVisitType === 'avulsa' ? `
              <div style="background-color: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fed7aa;">
                <h3 style="color: #c2410c; margin-top: 0; font-size: 16px;">Detalhes do Serviço Avulso</h3>
                <p style="margin: 0 0 8px 0;"><strong>Valor Acordado:</strong> R$ ${avulsaPrice || 'Não informado'}</p>
                <p style="margin: 0 0 8px 0;"><strong>Orçamento:</strong> ${avulsaApproved ? 'Aprovado pelo Cliente' : 'Não Aprovado'}</p>
                ${avulsaApproved ? `<p style="margin: 0;"><strong>Status da Execução:</strong> ${avulsaStatus === 'pendente_material' ? 'Pendente (Aguardando Peça/Material)' : 'Serviço Executado'}</p>` : ''}
              </div>
              ` : ''}
              <h3 style="color: #2F2F2F;">Resumo dos Itens Verificados:</h3>
              <ul style="padding-left: 20px;">${itemsHtml}</ul>
              ${materialsUsed ? `<h3 style="color: #2F2F2F; margin-top: 20px;">Materiais Aplicados:</h3><p style="background-color: #fff7ed; padding: 10px; border-radius: 6px;">${materialsUsed}</p>` : ''}
              ${observations ? `<h3 style="color: #2F2F2F; margin-top: 20px;">Diagnóstico e Observações:</h3><p style="background-color: #f9fafb; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb;">${observations}</p>` : ''}
              ${needsFollowUp ? `
              <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fca5a5;">
                <h3 style="color: #b91c1c; margin-top: 0; font-size: 16px;">⚠️ Atenção: Retorno Necessário</h3>
                <p style="margin: 0; color: #991b1b;">Foi sinalizada a necessidade de um novo agendamento com reposição de peça(s) / material adicional para a conclusão definitiva deste serviço.</p>
              </div>
              ` : ''}
              <p style="margin-top: 30px; font-size: 12px; color: #9ca3af;">Este é um e-mail automático gerado pelo sistema ManutecOS.</p>
            </div>
          `;
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'mail'), {
            to: clientData.email,
            message: { subject: `Ordem de Serviço Concluída #${newOsRef.id.slice(0,8).toUpperCase()} - Manutec`, html: emailHtml },
            osId: newOsRef.id,
            createdAt: new Date().toISOString()
          });
        } catch (emailError) { console.error("Erro ao enfileirar e-mail:", emailError); }
      }

      const newTasks = validChecklistItems.map(i => i.task.trim());
      const newLocs = validChecklistItems.map(i => i.location.trim()).filter(l => l !== '');
      const isManutencao = osType === 'manutencao';
      const currentTasksList = isManutencao ? dynamicTasksManutencao : dynamicTasksLimpeza;
      const addedTasks = newTasks.filter(t => !currentTasksList.some(ct => ct.toLowerCase() === t.toLowerCase()));
      const addedLocs = newLocs.filter(l => !dynamicLocations.some(dl => dl.toLowerCase() === l.toLowerCase()));
      if (addedTasks.length > 0 || addedLocs.length > 0) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'options', 'global');
        const updates = {};
        if (addedTasks.length > 0) {
           if (isManutencao) updates.tasksManutencao = arrayUnion(...addedTasks);
           else updates.tasksLimpeza = arrayUnion(...addedTasks);
        }
        if (addedLocs.length > 0) { updates.locations = arrayUnion(...addedLocs); }
        try {
          await setDoc(docRef, updates, { merge: true });
          if (addedTasks.length > 0) {
            if (isManutencao) setDynamicTasksManutencao(prev => [...new Set([...prev, ...addedTasks])].sort());
            else setDynamicTasksLimpeza(prev => [...new Set([...prev, ...addedTasks])].sort());
          }
          if (addedLocs.length > 0) setDynamicLocations(prev => [...new Set([...prev, ...addedLocs])].sort());
        } catch (optsError) { console.error("Aviso: Falha ao arquivar novas palavras na base global.", optsError); }
      }
      setOsType('manutencao'); setVisitType('preventiva'); setSelectedTechId(''); setSelectedClientId('');
      setAvulsaPrice(''); setAvulsaApproved(false); setAvulsaStatus('executado');
      setNeedsFollowUp(false);
      const today = new Date().toISOString().split('T')[0];
      setClientData({ name: '', email: '', address: '', cnpj: '', phone: '', responsible: '', date: today });
      setObservations(''); setMaterialsUsed(''); if (signatureRef.current) signatureRef.current.clear();
      setSignatureData(null); 
      setChecklistItems([{ id: Date.now().toString(), task: '', location: '', status: 'pending', notes: '', dayOfWeek: '' }]);
      notify("Ordem de Serviço finalizada com sucesso!", "success");
      setCurrentView('history');
    } catch (err) { notify("Erro ao salvar OS.", "error"); } finally { setIsSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div></div>;

  if (!user || !isAppUnlocked) {
    return (
      <div className="min-h-screen bg-[#2F2F2F] flex flex-col items-center justify-center p-4">
        <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
          * { font-family: 'Roboto', sans-serif !important; font-style: normal !important; }
        `}} />
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-zinc-200">
          <div className="flex justify-center mb-8"><div className="bg-orange-600 p-2 rounded-lg shadow-sm"><Wrench className="text-white" size={28}/></div><div className="flex flex-col ml-3 justify-center"><span className="text-2xl tracking-tight text-[#2F2F2F] font-bold leading-none">Manutec</span><span className="text-orange-600 font-semibold text-sm leading-tight mt-0.5">Soluções em Manutenção</span></div></div>
          <h2 className="text-lg text-center text-[#2F2F2F] mb-6 font-semibold">Acesso ao Sistema</h2>
          {authError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200 flex items-start"><AlertTriangle size={16} className="mr-2 mt-0.5 shrink-0" /><span>{authError}</span></div>}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div><label className="block text-sm text-[#2F2F2F] font-medium mb-1">E-mail Corporativo</label><input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-orange-500 outline-none text-[#2F2F2F]" placeholder="exemplo@manutec.com.br" /></div>
            <div><label className="block text-sm text-[#2F2F2F] font-medium mb-1">Senha de Acesso</label><input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-orange-500 outline-none text-[#2F2F2F]" placeholder="••••••••" /></div>
            <button type="submit" disabled={isAuthenticating} className="w-full py-3 mt-2 bg-orange-600 text-white font-medium text-sm rounded-lg shadow-sm hover:bg-orange-700 transition-colors disabled:opacity-50">{isAuthenticating ? 'Aguarde...' : (isLoginMode ? 'Acessar' : 'Cadastrar Perfil')}</button>
          </form>
          <div className="mt-6 text-center"><button type="button" onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); setAuthCode(''); }} className="text-orange-600 text-sm font-medium hover:underline">{isLoginMode ? 'Primeiro acesso? Registre-se' : 'Já sou cadastrado'}</button></div>
        </div>
      </div>
    );
  }

  const pendingSchedulesCount = schedules.filter(s => s.status === 'Agendado').length;

  return (
    <div className="flex h-screen bg-zinc-100 overflow-hidden relative text-[#2F2F2F]">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        * { font-family: 'Roboto', sans-serif !important; font-style: normal !important; }
        @media print { body * { visibility: hidden; } .print-container, .print-container * { visibility: visible; } .print-container { position: absolute; left: 0; top: 0; width: 100%; border:none; box-shadow:none; padding:0; margin:0; } .no-print { display: none !important; } }
      `}} />

      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-2.5 rounded-lg shadow-lg animate-in slide-in-from-top duration-300 ${notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-[#2F2F2F] text-white'}`}>
           {notification.type === 'error' ? <XCircle size={18}/> : <Info size={18} className="text-orange-500"/>}
           <span className="font-medium text-sm">{notification.msg}</span>
        </div>
      )}

      <aside className="w-64 bg-[#2F2F2F] text-white flex flex-col hidden md:flex shrink-0 border-r border-zinc-800">
        <div className="p-6 border-b border-zinc-800 bg-[#262626]">
           <div className="flex items-center gap-3 mb-2"><div className="bg-orange-600 p-2 rounded-lg shadow-sm"><Wrench className="text-white" size={18}/></div><div className="flex flex-col"><h1 className="text-lg font-bold text-white leading-none">Manutec</h1><span className="text-orange-500 font-medium text-[10px] mt-1 uppercase tracking-wide">Soluções em Manutenção</span></div></div>
           <p className="text-xs text-zinc-400 font-medium mt-2">Portal de Serviços</p>
        </div>
        <div className="px-4 pt-4 pb-2">
           <div className="bg-zinc-800 p-1 rounded-lg flex text-xs font-medium text-center">
              {isAdmin && (
  <button
    onClick={() => setCurrentView('dashboard')}
    className={`flex-1 py-1.5 rounded-md transition-colors ${userRole === 'gestor' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white'}`}
  >
    Gestor
  </button>
)}
              <button 
  onClick={() => setCurrentView('new')}
  className={`flex-1 py-1.5 rounded-md transition-colors ${userRole === 'tecnico' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white'}`}
>
  Técnico
</button>

           </div>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Resumo Operacional', roles: ['gestor'] },
            { id: 'agenda', icon: CalendarDays, label: 'Agenda', roles: ['gestor', 'tecnico', 'cliente'], badge: pendingSchedulesCount },
            { id: 'new', icon: PlusCircle, label: 'Nova OS', roles: ['gestor', 'tecnico'] },
            { id: 'history', icon: History, label: 'Meus Laudos', roles: ['gestor', 'tecnico', 'cliente'] },
            { id: 'clients', icon: Building, label: userRole === 'gestor' ? 'Contratos' : 'Clientes', roles: ['gestor'] },
            { id: 'technicians', icon: UserCog, label: 'Equipe', roles: ['gestor'] },
          ].filter(m => m.roles.includes(userRole)).map(m => {
            const IconComponent = m.icon; const active = currentView === m.id || (currentView === 'view' && m.id === 'history');
            return (
              <button key={m.id} onClick={() => setCurrentView(m.id)} className={`w-full flex items-center px-4 py-2.5 rounded-lg transition-all duration-300 ${active ? 'bg-orange-600 text-white font-medium shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-white'}`}>
                <IconComponent size={18} className="mr-3" /> 
                <span className="text-sm flex-1 text-left">{m.label}</span>
                {m.badge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{m.badge}</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-zinc-800 bg-[#262626]"><button onClick={handleLogout} className="w-full flex items-center px-4 py-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-all text-sm font-medium"><LogOut size={18} className="mr-3" /> Sair do Sistema</button></div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50">
        <header className="bg-[#2F2F2F] text-white p-4 flex justify-between items-center md:hidden shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-3"><div className="bg-orange-600 p-1.5 rounded-lg shadow-sm"><Wrench className="text-white" size={16}/></div><div className="flex flex-col"><h1 className="text-base font-bold text-white leading-none">Manutec</h1><span className="text-orange-500 text-[9px] font-medium mt-0.5 uppercase tracking-wide">Soluções em Manutenção</span></div></div>
          <button onClick={handleLogout} className="text-zinc-400 hover:text-red-400 transition-colors"><LogOut size={22} /></button>
        </header>
        <div className="md:hidden bg-[#262626] px-4 py-2 border-t border-zinc-700">
           <div className="bg-zinc-800 p-1 rounded-lg flex text-[10px] font-medium text-center">
              {isAdmin && (
  <button
    onClick={() => setCurrentView('dashboard')}
    className={`flex-1 py-1.5 rounded-md transition-colors ${userRole === 'gestor' ? 'bg-orange-600 text-white' : 'text-zinc-400'}`}
  >
    Gestor
  </button>
)}
              <button
  onClick={() => setCurrentView('new')}
  className={`flex-1 py-1.5 rounded-md transition-colors ${userRole === 'tecnico' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white'}`}
>
  Técnico
</button>

              {isAdmin && (
  <button
    onClick={() => setCurrentView('agenda')}
    className={`flex-1 py-1.5 rounded-md transition-colors ${
      userRole === 'cliente'
        ? 'bg-orange-600 text-white'
        : 'text-zinc-400 hover:text-white'
    }`}
  >
    Cliente
  </button>
)}
           </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {currentView === 'dashboard' && userRole === 'gestor' && renderDashboard()}
          {currentView === 'agenda' && renderAgenda()}
          {currentView === 'new' && userRole !== 'cliente' && renderNewOS()}
          {currentView === 'history' && renderHistoryList()}
          {currentView === 'view' && renderViewOrder()}
          {currentView === 'clients' && userRole === 'gestor' && renderClientsList()}
          {currentView === 'technicians' && userRole === 'gestor' && renderTechniciansList()}
        </div>
        <nav className="bg-[#2F2F2F] border-t border-zinc-800 md:hidden flex overflow-x-auto shrink-0 pb-6 shadow-inner z-20">
           {[
             { id: 'dashboard', icon: LayoutDashboard, label: 'Dash', roles: ['gestor'] },
             { id: 'agenda', icon: CalendarDays, label: 'Agenda', roles: ['gestor', 'tecnico', 'cliente'], badge: pendingSchedulesCount },
             { id: 'new', icon: PlusCircle, label: 'Nova OS', roles: ['gestor', 'tecnico'] },
             { id: 'history', icon: History, label: 'Laudos', roles: ['gestor', 'tecnico', 'cliente'] },
             { id: 'clients', icon: Building, label: userRole === 'gestor' ? 'Contratos' : 'Clientes', roles: ['gestor', 'tecnico'] },
             { id: 'technicians', icon: UserCog, label: 'Equipe', roles: ['gestor'] },
           ].filter(m => {
  if (!isAdmin && m.roles.includes('gestor') && !m.roles.includes('tecnico') && !m.roles.includes('cliente')) {
    return false;
  }

  return m.roles.includes(userRole);
}).map(m => {
  
             const IconComponent = m.icon; const active = currentView === m.id;
             return (
               <button key={m.id} onClick={() => setCurrentView(m.id)} className={`min-w-[65px] flex-1 py-3 flex flex-col items-center justify-center transition-all duration-300 ${active ? 'text-orange-500 font-medium' : 'text-zinc-400'}`}>
                 <div className="relative">
                   <IconComponent size={20} className="mb-1" />
                   {m.badge > 0 && <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0 rounded-full">{m.badge}</span>}
                 </div>
                 <span className="text-[10px] mt-0.5">{m.label}</span>
               </button>
             );
           })}
        </nav>
      </main>
    </div>
  );

  function renderDashboard() {
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long'
  });

  const completedToday = orders.length;

  const pendingRepairs = orders.reduce((total, order) => {
    return total + getRepairsCount(order.checklistItems || []);
  }, 0);
  const pendingOrders = orders.filter(order =>
  order.status !== 'Concluída'
  ).length;
  const activeClients = clients.length;
  const scheduledVisits = schedules.filter(s => s.status === 'Agendado').length;
  const todaySchedules = schedules.slice(0, 3);

  const criticalClients = clients.filter(c => {
    const preventivaExceeded =
      c.contract?.preventiva?.used >= c.contract?.preventiva?.total &&
      c.contract?.preventiva?.total > 0;

    const emergencialExceeded =
      c.contract?.emergencial?.used >= c.contract?.emergencial?.total &&
      c.contract?.emergencial?.total > 0;

    return preventivaExceeded || emergencialExceeded;
  });

  const kpis = [
    {
      label: 'OS Realizadas',
      value: completedToday,
      helper: 'Total no sistema',
      icon: ClipboardCheck,
      accent: 'text-orange-600',
      bg: 'bg-orange-50'
    },
    {
      label: 'Pendências',
      value: pendingOrders,
      helper: 'OS pendentes',
      icon: AlertTriangle,
      accent: 'text-red-600',
      bg: 'bg-red-50'
    },
    {
      label: 'Clientes',
      value: activeClients,
      helper: 'Unidades ativas',
      icon: Building,
      accent: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      label: 'Agenda',
      value: scheduledVisits,
      helper: 'Visitas previstas',
      icon: CalendarDays,
      accent: 'text-amber-600',
      bg: 'bg-amber-50'
    }
  ];

  return (
    <div className="space-y-5 pb-24">
      <section className="relative overflow-hidden rounded-[28px] bg-[#2F2F2F] text-white p-6 shadow-xl border border-zinc-700">
        <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-orange-600/25 blur-sm"></div>
        <div className="absolute right-8 bottom-6 w-16 h-16 rounded-full bg-white/5"></div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-3 py-1 mb-4">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold tracking-[0.22em] text-orange-300 uppercase">
              ManutecOS Online
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">
            Boa operação,<br className="md:hidden" /> {user?.email?.split('@')[0] || 'Usuário'}
          </h2>
          
          <p className="text-xs text-red-300 mt-2">
            {user?.email} | Admin: {isAdmin ? 'SIM' : 'NÃO'}
          </p>
          <p className="text-zinc-300 mt-3 text-sm font-medium">
            Painel executivo da Manutec • {today}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;

          return (
            <div
              key={index}
              className="bg-white rounded-[24px] p-5 border border-zinc-200 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-5">
                <div className={`w-12 h-12 rounded-2xl ${kpi.bg} flex items-center justify-center`}>
                  <Icon size={22} className={kpi.accent} />
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase">
                  Hoje
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 font-black uppercase tracking-wide">
                {kpi.label}
              </p>

              <h3 className="text-4xl font-black text-[#2F2F2F] mt-2 leading-none">
                {kpi.value}
              </h3>

              <p className={`text-xs font-bold mt-3 ${kpi.accent}`}>
                {kpi.helper}
              </p>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
  <div className="bg-white rounded-[24px] p-6 border border-zinc-200 shadow-sm">
    <div className="flex justify-between items-start mb-5">
      <div>
        <h3 className="text-xl font-black text-[#2F2F2F]">
          Agenda de Hoje
        </h3>
        <p className="text-sm text-zinc-500 mt-1">
          Próximos atendimentos da operação
        </p>
      </div>

      <button
        onClick={() => setCurrentView('agenda')}
        className="text-orange-600 text-sm font-black hover:underline"
      >
        Ver agenda
      </button>
    </div>

    <div className="space-y-3">
      {todaySchedules.length > 0 ? (
        todaySchedules.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between bg-zinc-50 rounded-2xl p-4 border border-zinc-100"
          >
            <div>
              <p className="font-black text-[#2F2F2F] uppercase text-sm">
                {clients.find(c => c.id === s.clientId)?.name || 'Cliente'}
              </p>
              <p className="text-xs text-zinc-500 mt-1 font-medium">
                {s.date} • {s.time} • {s.visitType}
              </p>
            </div>

            <span className="text-[10px] bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-black uppercase">
              Agendado
            </span>
          </div>
        ))
      ) : (
        <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100 text-center">
          <CalendarDays className="mx-auto text-zinc-300 mb-2" size={28} />
          <p className="text-sm text-zinc-500 font-medium">
            Nenhum atendimento agendado.
          </p>
        </div>
      )}
    </div>
  </div>

  <div className="bg-white rounded-[24px] p-6 border border-zinc-200 shadow-sm">
    <div className="flex items-start gap-3 mb-5">
      <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
        <Bell className="text-orange-600" size={22} />
      </div>

      <div>
        <h3 className="text-xl font-black text-[#2F2F2F]">
          Alertas Críticos
        </h3>
        <p className="text-sm text-zinc-500 mt-1">
          Contratos, cotas e pendências
        </p>
      </div>
    </div>

    <div className="space-y-3">
      {criticalClients.length > 0 ? (
        criticalClients.map(c => (
          <div
            key={c.id}
            className="bg-red-50 border border-red-200 rounded-2xl p-4 flex justify-between items-center"
          >
            <div>
              <p className="font-black text-red-700 uppercase text-sm">
                {c.name}
              </p>
              <p className="text-xs text-red-500 mt-1 font-bold">
                Cota excedida ou no limite
              </p>
            </div>

            <AlertTriangle className="text-red-600" size={22} />
          </div>
        ))
      ) : (
        <div className="bg-green-50 rounded-2xl p-5 border border-green-100 text-center">
          <CheckCircle className="mx-auto text-green-600 mb-2" size={28} />
          <p className="text-sm text-green-700 font-bold">
            Nenhum alerta crítico no momento.
          </p>
        </div>
      )}
    </div>
  </div>
</section>

      <section className="bg-white rounded-[24px] p-6 border border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-black text-[#2F2F2F]">
              Ações Rápidas
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              Atalhos principais da operação
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setCurrentView('new')}
            className="bg-orange-600 text-white rounded-2xl p-4 font-black shadow-sm hover:bg-orange-700 transition-all"
          >
           + Nova OS
  {pendingOrders > 0 && (
    <span className="ml-2 bg-white text-orange-600 text-xs font-black px-2 py-1 rounded-full">
      {pendingOrders}
    </span>
  )}
</button>

 <button
  onClick={() => setCurrentView('agenda')}
  className="bg-zinc-100 text-[#2F2F2F] rounded-2xl p-4 font-black hover:bg-zinc-200 transition-all"
>
  Agenda
</button>

          <button
            onClick={() => setCurrentView('clients')}
            className="bg-zinc-100 text-[#2F2F2F] rounded-2xl p-4 font-black hover:bg-zinc-200 transition-all"
          >
            Clientes
          </button>

          <button
            onClick={() => setCurrentView('history')}
            className="bg-zinc-100 text-[#2F2F2F] rounded-2xl p-4 font-black hover:bg-zinc-200 transition-all"
          >
            Histórico
          </button>
               </div>
      </section>
    </div>
  );
}


  function renderAgenda() {
    const isClient = userRole === 'cliente';
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-[#2F2F2F]">{isClient ? 'Solicitar Atendimento' : 'Controle de Agenda'}</h2><button onClick={() => setShowScheduleModal(true)} className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center shadow-sm text-sm font-medium hover:bg-orange-700 transition-all"><CalendarDays size={18} className="mr-2" /> Agendar</button></div>
        {showScheduleModal && (
          <div className="fixed inset-0 bg-zinc-900/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-4 border-zinc-100"><h3 className="font-bold text-[#2F2F2F] text-lg">Novo Registro</h3><button onClick={() => setShowScheduleModal(false)} className="text-zinc-400 hover:text-zinc-800 transition-colors"><X size={20}/></button></div>
              <form onSubmit={handleSaveSchedule} className="space-y-4">
                <div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1">{isClient ? 'Sua Empresa *' : 'Cliente *'}</label><select required value={newSchedule.clientId} onChange={e => setNewSchedule({...newSchedule, clientId: e.target.value})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 font-medium text-sm text-[#2F2F2F]"><option value="" disabled>Selecione...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1">Data *</label><input type="date" required value={newSchedule.date} onChange={e => setNewSchedule({...newSchedule, date: e.target.value})} className="w-full border border-zinc-300 p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm font-medium text-[#2F2F2F]" /></div><div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1">Hora *</label><input type="time" required value={newSchedule.time} onChange={e => setNewSchedule({...newSchedule, time: e.target.value})} className="w-full border border-zinc-300 p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm font-medium text-[#2F2F2F]" /></div></div>
                <div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1">Modo de Serviço *</label><select value={newSchedule.visitType} onChange={e => setNewSchedule({...newSchedule, visitType: e.target.value})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm font-medium text-[#2F2F2F]"><option value="preventiva">Preventiva</option><option value="emergencial">Emergencial (SLA 4H)</option><option value="diaria_limpeza">Diária Limpeza</option><option value="avulsa">Avulsa / Extra</option></select></div>
                {!isClient && (<div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1">Técnico / Squad *</label><select required value={newSchedule.technicianId} onChange={e => setNewSchedule({...newSchedule, technicianId: e.target.value})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm font-medium text-[#2F2F2F]"><option value="" disabled>Selecione...</option>{technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>)}
                <div className="pt-4 border-t border-zinc-100 mt-2">
                  <h4 className="text-xs font-bold text-orange-600 mb-3 uppercase tracking-widest flex items-center gap-1.5"><Activity size={14}/> Pré-diagnóstico / Relato</h4>
                  {newSchedule.scheduledItems.map((item) => (
                    <div key={item.id} className="relative mb-3 bg-zinc-50 p-4 rounded-lg border border-zinc-200 shadow-sm">
                      {newSchedule.scheduledItems.length > 1 && (<button type="button" onClick={() => handleRemoveScheduleItem(item.id)} className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 transition-colors"><X size={16}/></button>)}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AutocompleteInput label="Item / Tarefa a Verificar" value={item.task} onChange={(val) => handleUpdateScheduleItem(item.id, 'task', val)} options={newSchedule.visitType === 'diaria_limpeza' ? dynamicTasksLimpeza : dynamicTasksManutencao} placeholder="Opcional..." required={false} />
                        <AutocompleteInput label="Local do Atendimento" value={item.location} onChange={(val) => handleUpdateScheduleItem(item.id, 'location', val)} options={dynamicLocations} placeholder="Opcional..." required={false} />
                      </div>
                    </div>
                  ))}
                  {(!isClient || newSchedule.scheduledItems.length < 4) ? (
                    <button type="button" onClick={handleAddScheduleItem} className="w-full py-2.5 mb-4 border border-dashed border-zinc-300 text-zinc-500 text-xs font-semibold rounded-lg hover:bg-zinc-50 hover:text-orange-600 hover:border-orange-300 transition-colors flex items-center justify-center gap-2"><PlusCircle size={16} /> Adicionar Item / Local</button>
                  ) : (
                    <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-lg text-xs font-medium text-center mb-4">Limite de 4 itens por visita atingido. Caso possua mais problemas, detalhe-os no campo de observações abaixo, pois nossa capacidade de atendimento diário é limitada.</div>
                  )}
                  <div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1">Observações Adicionais (Opcional)</label><textarea value={newSchedule.notes || ''} onChange={e => setNewSchedule({...newSchedule, notes: e.target.value})} className="w-full border border-zinc-300 p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm text-[#2F2F2F] resize-y" rows="3" placeholder="Ex: Detalhe aqui barulhos no equipamento, falhas diversas ou instruções para acesso ao local..." /></div>
                </div>
                <button type="submit" className="w-full py-3 bg-orange-600 text-white font-medium text-sm rounded-lg shadow-sm hover:bg-orange-700 transition-all mt-4">Confirmar Agendamento</button>
              </form>
            </div>
          </div>
        )}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100 shadow-sm">
          {schedules.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm font-medium">Nenhum agendamento futuro.</div>
          ) : (
            schedules.map(sch => { 
              const client = clients.find(c => c.id === sch.clientId); 
              return (
                <div key={sch.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-zinc-50 transition-colors gap-4"> 
                  <div className="flex gap-4 items-start w-full md:w-auto"> 
                    <div className="p-3 rounded-lg text-center min-w-[60px] bg-orange-50 text-orange-600 border border-orange-100 mt-1"><span className="text-xl font-bold leading-none">{new Date(sch.date + "T12:00:00").getDate()}</span></div> 
                    <div className="flex-1">
                      <h4 className="font-bold text-[#2F2F2F] text-base leading-tight uppercase">{sch.time} - {client?.name}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 mb-2"><span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest bg-zinc-200 px-2 py-0.5 rounded-md">{sch.visitType.replace('_', ' ')}</span></div>
                      {sch.scheduledItems && sch.scheduledItems.length > 0 && (
                        <div className="mt-2 space-y-1.5 border-l-2 border-orange-200 pl-3">
                           {sch.scheduledItems.map((item, idx) => (
                              <p key={idx} className="text-sm text-zinc-800 font-medium flex items-center flex-wrap gap-1"><Wrench size={12} className="text-orange-500 shrink-0"/> {item.task || 'Tarefa não especificada'} {item.location && <span className="text-xs text-zinc-500 font-medium ml-1 flex items-center bg-zinc-100 px-1.5 py-0.5 rounded"><MapPin size={10} className="mr-0.5 text-zinc-400"/> {item.location}</span>}</p>
                           ))}
                        </div>
                      )}
                      {!sch.scheduledItems && sch.task && <p className="text-sm text-zinc-800 font-medium mt-2 flex items-center border-l-2 border-orange-200 pl-3"><Wrench size={12} className="mr-1.5 text-orange-500"/> {sch.task}</p>}
                      {sch.notes && <p className="text-xs text-zinc-500 font-medium mt-2 italic bg-zinc-100 p-2 rounded-md">"{sch.notes}"</p>}
                    </div> 
                  </div> 
                  {!isClient && (
  <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto shrink-0 mt-2 md:mt-0">
    {userRole !== 'cliente' && sch.status !== 'Concluído' && (
  <button
    onClick={() => {
      const clientRecord = clients.find(c => c.id === sch.clientId);

      setSelectedClientId(sch.clientId);
      setVisitType(sch.visitType);

      setClientData({
        name: clientRecord?.name || '',
        email: clientRecord?.email || '',
        address: clientRecord?.address || '',
        cnpj: clientRecord?.cnpj || '',
        phone: clientRecord?.phone || '',
        responsible: clientRecord?.responsible || '',
        date: sch.date || new Date().toISOString().split('T')[0]
      });

      setCurrentView('new');
    }}
    className="px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition-all w-full md:w-auto"
  >
    Iniciar OS
  </button>
)}
    {sch.status !== 'Concluído' && (
      <button
        onClick={() =>
          updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'schedules', sch.id), {
            status: 'Concluído'
          })
        }
        className="px-4 py-2 border border-zinc-300 rounded-lg text-xs font-medium hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-all text-zinc-600 w-full md:w-auto"
      >
        Finalizar Visita
      </button>
    )}

    {isAdmin && (
      <button
        onClick={async () => {
          if (window.confirm('Tem certeza que deseja excluir este agendamento? Essa ação não poderá ser desfeita.')) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'schedules', sch.id));
            notify('Agendamento excluído com sucesso.', 'success');
          }
        }}
        className="px-4 py-2 border border-red-200 bg-red-50 rounded-lg text-xs font-bold text-red-600 hover:bg-red-100 transition-all w-full md:w-auto"
      >
        Excluir
      </button>
    )}
  </div>
)}
                </div>
              ); 
            })
          )}
        </div>
      </div>
    );
  }

  function renderNewOS() {
   const loggedTech = technicians.find(
    t => t.email?.toLowerCase() === user?.email?.toLowerCase()
  );
  const techId = userRole === 'tecnico'
  ? loggedTech?.id
  : selectedTechId;
  const selectedTech = technicians.find(t => t.id === techId);
    return (
      <div className="max-w-4xl mx-auto pb-12">
        <div className="mb-6 flex items-center justify-between"><h2 className="text-2xl font-bold text-[#2F2F2F]">
  {osType === 'limpeza'
    ? 'Checklist de Limpeza e Conservação'
    : 'Vistoria Técnica de Campo'}
</h2><button onClick={() => setCurrentView('dashboard')} className="p-2 text-zinc-400 hover:text-[#2F2F2F] transition-all"><X size={20} /></button></div>
        <form onSubmit={handleSaveOS} className="space-y-6">
          <section className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-600"></div>
            <h3 className="text-sm font-bold text-[#2F2F2F] mb-4 flex items-center gap-2 border-b border-zinc-100 pb-3 uppercase tracking-widest"><Briefcase size={18} className="text-orange-600"/> Identificação Operacional</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
  <label className="block text-xs font-semibold text-[#2F2F2F] mb-1">
  {osType === 'limpeza'
    ? 'Auxiliar / Responsável pela Limpeza *'
    : 'Responsável Técnico *'}
</label>

  {userRole === 'tecnico' ? (
    <input
      value={loggedTech?.name || ''}
      disabled
      className="w-full rounded-lg border border-zinc-300 p-2.5 bg-zinc-100 text-sm font-medium text-[#2F2F2F]"
    />
  ) : (
    <select
      required
      value={selectedTechId}
      onChange={e => setSelectedTechId(e.target.value)}
      className="w-full rounded-lg border border-zinc-300 p-2.5 bg-white outline-none focus:border-orange-500 text-sm font-medium text-[#2F2F2F]"
    >
      <option value="" disabled>Selecione...</option>
      {technicians.map(t => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  )}
</div>
              <div>{osType === 'limpeza'
  ? 'Tipo de Serviço'
  : 'Equipe de Atendimento'}<div className="flex gap-3"><button type="button" onClick={() => { setOsType('manutencao'); setVisitType('preventiva'); }} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${osType === 'manutencao' ? 'bg-[#2F2F2F] text-white border-[#2F2F2F] shadow-sm' : 'bg-white border-zinc-300 text-zinc-600'}`}>Técnica</button><button type="button" onClick={() => { setOsType('limpeza'); setVisitType('diaria_limpeza'); }} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${osType === 'limpeza' ? 'bg-orange-600 text-white border-orange-600 shadow-sm' : 'bg-white border-zinc-300 text-zinc-600'}`}>Limpeza</button></div></div>
              <div className="md:col-span-2"><label className="block text-xs font-semibold text-[#2F2F2F] mb-1">Unidade do Cliente *</label><select required value={selectedClientId} onChange={(e) => { setSelectedClientId(e.target.value); const c = clients.find(x=>x.id===e.target.value); if(c) setClientData({...c, date:clientData.date}); }} className="w-full rounded-lg border border-zinc-300 p-2.5 bg-white text-sm font-medium outline-none focus:border-orange-500 text-[#2F2F2F] uppercase"><option value="" disabled>Selecione a Empresa...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              {selectedClientId && (
                 <div className="md:col-span-2 p-4 bg-zinc-50 border border-zinc-200 rounded-lg flex flex-col md:flex-row gap-4 md:gap-8 text-sm font-medium text-zinc-700">
                    <div><span className="text-zinc-500 text-[10px] block mb-0.5">Empresa</span> <span className="uppercase">{clientData.name}</span></div>
                    <div><span className="text-zinc-500 text-[10px] block mb-0.5">Contato</span> <span className="uppercase">{clientData.phone || 'N/A'}</span></div>
                    <div><span className="text-zinc-500 text-[10px] block mb-0.5">Email</span> <span>{clientData.email || 'N/A'}</span></div>
                 </div>
              )}
              <div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1">Data da Execução *</label><input type="date" required value={clientData.date} onChange={e => { setClientData({...clientData, date: e.target.value}); }} className="w-full rounded-lg border border-zinc-300 p-2.5 outline-none font-medium text-sm bg-white text-[#2F2F2F]" /></div>
              {osType === 'manutencao' && (
                 <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[#2F2F2F] mb-1">Consumo de Cotas (Opcional):</label>
                    <div className="flex gap-2">
                       {['avulsa', 'preventiva', 'emergencial'].map(t => {
                          let title = t; let subtitle = null; const clientRecord = clients.find(c => c.id === selectedClientId);
                          if (clientRecord && clientRecord.contract && clientRecord.contract.hasManutencao) {
                             if (t === 'preventiva') { const rest = (clientRecord.contract.preventiva?.total || 0) - (clientRecord.contract.preventiva?.used || 0); subtitle = `(${rest})`; }
                             else if (t === 'emergencial') { const rest = (clientRecord.contract.emergencial?.total || 0) - (clientRecord.contract.emergencial?.used || 0); subtitle = `(${rest})`; }
                          }
                          return (
                            <button key={t} type="button" onClick={() => setVisitType(t)} className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg border transition-all capitalize ${visitType === t ? 'bg-orange-600 text-white border-orange-600 shadow-sm' : 'bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-50'}`}>
                              <span className="text-xs font-medium leading-none">{title}</span>
                              {subtitle && <span className={`text-[10px] font-bold mt-1 leading-none ${visitType === t ? 'text-white' : 'text-zinc-500'}`}>{subtitle}</span>}
                            </button>
                          );
                       })}

{osType === 'limpeza' && (
  <div className="md:col-span-2">
    <label className="block text-xs font-semibold text-[#2F2F2F] mb-1">
      Tipo de Limpeza
    </label>

    <div className="flex gap-2">
      {['rotina', 'reforco', 'pos_obra'].map(t => (
        <button
          key={t}
          type="button"
          onClick={() => setVisitType(t)}
          className={`flex-1 py-2 rounded-lg border transition-all capitalize ${
            visitType === t
              ? 'bg-green-600 text-white border-green-600 shadow-sm'
              : 'bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          {t.replace('_', ' ')}
        </button>
      ))}
    </div>
  </div>
)}

                    </div>
                    {visitType === 'avulsa' && (
                       <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl animate-in fade-in duration-300">
                         <h4 className="text-xs font-bold text-orange-800 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Zap size={14}/> Detalhes do Serviço Avulso</h4>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div><label className="block text-[10px] font-semibold text-zinc-500 mb-1">Valor Cobrado (R$)</label><input type="text" placeholder="Ex: 150,00" value={avulsaPrice} onChange={e => setAvulsaPrice(e.target.value)} className="w-full p-2.5 rounded-lg border border-zinc-300 text-sm font-medium outline-none focus:border-orange-500" /></div>
                           <div className="flex items-center"><label className="flex items-center gap-2 cursor-pointer mt-3"><input type="checkbox" checked={avulsaApproved} onChange={e => setAvulsaApproved(e.target.checked)} className="w-5 h-5 accent-orange-600" /><span className="text-xs font-semibold text-[#2F2F2F] uppercase">Cliente aprovou orçamento?</span></label></div>
                           {avulsaApproved && (<div><label className="block text-[10px] font-semibold text-zinc-500 mb-1 uppercase tracking-wide">Status da Execução</label><select value={avulsaStatus} onChange={e => setAvulsaStatus(e.target.value)} className="w-full p-2.5 rounded-lg border border-zinc-300 text-sm font-medium outline-none focus:border-orange-500"><option value="executado">Serviço Executado</option><option value="pendente_material">Aguardando Peça / Material</option></select></div>)}
                         </div>
                       </div>
                    )}
                    {osType === 'manutencao' && (
  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={needsFollowUp}
        onChange={(e) => setNeedsFollowUp(e.target.checked)}
        className="w-5 h-5 accent-yellow-500"
      />
      <div>
        <p className="text-sm font-bold text-[#2F2F2F] uppercase">
          Precisa de retorno / manter OS pendente
        </p>
        <p className="text-xs text-zinc-500">
          Marque quando o serviço não foi concluído e precisa de nova ação.
        </p>
      </div>
    </label>
  </div>
)}
                 </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
             <div className="p-5 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center"><h3 className="text-base font-bold text-[#2F2F2F] flex items-center gap-2"><HardHat size={18} className="text-orange-600"/> Check List - Itens</h3></div>
             <div className="p-5 space-y-4">
                {checklistItems.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl border border-zinc-200 bg-white relative hover:border-orange-300 transition-colors shadow-sm group">
                     <div className="absolute top-3 right-3 flex items-center gap-2">{checklistItems.length > 1 && (<button type="button" onClick={() => handleRemoveChecklistItem(item.id)} className="text-zinc-400 hover:text-red-500 transition-colors"><X size={16}/></button>)}</div>
                     <div className={`grid grid-cols-1 ${osType === 'limpeza' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mb-4 pr-6`}>
                        <AutocompleteInput label="Item / Tarefa Verificada *" value={item.task} onChange={(val) => handleUpdateChecklistItem(item.id, 'task', val)} options={osType === 'manutencao' ? dynamicTasksManutencao : dynamicTasksLimpeza} placeholder="Pesquise ou digite..." />
                        <AutocompleteInput label="Local do Atendimento *" value={item.location} onChange={(val) => handleUpdateChecklistItem(item.id, 'location', val)} options={dynamicLocations} placeholder="Pesquise ou digite..." />
                        {osType === 'limpeza' && (<div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1">Dia da Semana</label><select value={item.dayOfWeek || ''} onChange={(e) => handleUpdateChecklistItem(item.id, 'dayOfWeek', e.target.value)} className="w-full p-2.5 rounded-lg border border-zinc-300 text-sm font-medium outline-none focus:border-orange-500 text-zinc-800 bg-white uppercase"><option value="" disabled>Selecione...</option><option value="Segunda-feira">Segunda-feira</option><option value="Terça-feira">Terça-feira</option><option value="Quarta-feira">Quarta-feira</option><option value="Quinta-feira">Quinta-feira</option><option value="Sexta-feira">Sexta-feira</option></select></div>)}
                     </div>
                     <div className="mb-4">
                        <label className="block text-xs font-semibold text-[#2F2F2F] mb-2 uppercase tracking-widest">Status do Item</label>
                        <div className="flex gap-2">
                           {osType === 'limpeza' ? (
                             <>
                               <button type="button" onClick={() => handleUpdateChecklistItem(item.id, 'status', 'ok')} className={`px-4 py-2 rounded-lg border text-xs font-bold transition-all uppercase ${item.status==='ok'?'bg-green-50 text-green-700 border-green-300 shadow-sm':'bg-white text-zinc-500 border-zinc-300 hover:bg-zinc-50'}`}>Realizado</button>
                               <button type="button" onClick={() => handleUpdateChecklistItem(item.id, 'status', 'repair')} className={`px-4 py-2 rounded-lg border text-xs font-bold transition-all uppercase ${item.status==='repair'?'bg-red-50 text-red-700 border-red-300 shadow-sm':'bg-white text-zinc-500 border-zinc-300 hover:bg-zinc-50'}`}>Não Realizado</button>
                             </>
                           ) : (
                             <>
                               <button type="button" onClick={() => handleUpdateChecklistItem(item.id, 'status', 'ok')} className={`px-4 py-2 rounded-lg border text-xs font-bold transition-all ${item.status==='ok'?'bg-green-50 text-green-700 border-green-300 shadow-sm':'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50'}`}>OK</button>
                               <button type="button" onClick={() => handleUpdateChecklistItem(item.id, 'status', 'repair')} className={`px-4 py-2 rounded-lg border text-xs font-bold transition-all ${item.status==='repair'?'bg-red-50 text-red-700 border-red-300 shadow-sm':'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50'}`}>Reparo</button>
                               <button type="button" onClick={() => handleUpdateChecklistItem(item.id, 'status', 'na')} className={`px-4 py-2 rounded-lg border text-xs font-bold transition-all ${item.status==='na'?'bg-zinc-100 text-zinc-800 border-zinc-400 shadow-sm':'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50'}`}>N/A</button>
                             </>
                           )}
                        </div>
                     </div>
       <div>
  <label className="block text-xs font-semibold text-[#2F2F2F] mb-1 uppercase tracking-widest">
    Descrição / Apontamentos (Opcional)
  </label>

  <input
    type="text"
    value={item.notes}
    onChange={(e) =>
      handleUpdateChecklistItem(item.id, 'notes', e.target.value)
    }
    placeholder="Detalhes da manutenção..."
    className="w-full p-2.5 rounded-lg border border-zinc-300 text-sm outline-none focus:border-orange-500 text-zinc-700 font-bold uppercase"
  />
</div>
{osType === 'manutencao' && (
  <div className="mt-3">
    <label className="block text-xs font-semibold text-[#2F2F2F] mb-1 uppercase tracking-widest">
      Fotos do item
    </label>

    <input
      type="file"
      accept=".jpg,.jpeg,.png"
      multiple={false}
      onClick={saveOSDraft}
      onChange={async (e) => {
        try {
          const file = e.target.files?.[0];

          if (!file) return;

          notify('Processando foto...', 'info');

          const compressedFile = await compressImage(file);

          await handleChecklistPhoto(item.id, compressedFile);

          e.target.value = '';
        } catch (error) {
          console.error('Erro no input da foto:', error);

          notify('Não foi possível anexar a foto.', 'error');
        }
      }}
      className="w-full text-xs text-zinc-600"
    />

    {item.photos && item.photos.length > 0 && (
      <div className="grid grid-cols-2 gap-2 mt-3">
        {item.photos.map((photo, index) => (
          <img
            key={index}
            src={photo}
            alt={`Foto ${index + 1}`}
            className="w-full h-32 object-cover rounded-lg border border-zinc-200"
          />
        ))}
      </div>
    )}
  </div>
)}
</div>

))}

                <button type="button" onClick={handleAddChecklistItem} className="w-full py-3 border-2 border-dashed border-zinc-300 text-zinc-500 font-medium text-sm rounded-xl hover:bg-zinc-50 hover:text-orange-600 transition-colors flex items-center justify-center gap-2"><PlusCircle size={18} /> Adicionar Novo Item</button>
             </div>
          </section>
          {osType === 'manutencao' && (<section className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm"><h3 className="text-sm font-bold text-[#2F2F2F] mb-3 flex items-center gap-2 uppercase tracking-widest"><PackageOpen size={16} className="text-orange-600"/> Materiais Aplicados (Faturamento Extra)</h3><textarea value={materialsUsed} onChange={e => setMaterialsUsed(e.target.value)} rows="3" className="w-full border border-zinc-300 p-3 rounded-lg focus:ring-2 focus:border-orange-500 outline-none text-sm text-[#2F2F2F] resize-y uppercase font-bold" placeholder="Relacione peças ou materiais extras que devam ser faturados..."></textarea></section>)}
          <section className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
             <h3 className="text-sm font-bold text-[#2F2F2F] mb-4 uppercase tracking-widest">Observações Gerais e Assinatura</h3>
             {osType === 'manutencao' && (
  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={needsFollowUp}
        onChange={(e) => setNeedsFollowUp(e.target.checked)}
        className="w-6 h-6 accent-red-600"
      />

      <div>
        <p className="text-sm font-bold text-red-700 uppercase">
          Sinalizar necessidade de peça e novo agendamento
        </p>

        <p className="text-xs text-red-500 mt-1">
          Utilize quando o serviço precisar de retorno técnico.
        </p>
      </div>
    </label>
  </div>
)}
             <textarea value={observations} onChange={e => setObservations(e.target.value)} rows="3" className="w-full border border-zinc-300 p-3 rounded-lg focus:ring-2 focus:border-orange-500 outline-none text-sm font-bold text-[#2F2F2F] resize-y mb-5 uppercase" placeholder="Descreva aqui considerações finais do atendimento..."></textarea>
             <SignaturePad onSave={setSignatureData} signatureRef={signatureRef} />
          </section>
          <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#2F2F2F] text-white font-medium text-sm rounded-xl hover:bg-zinc-800 transition-all shadow-sm active:scale-[0.98] uppercase tracking-widest">{isSubmitting ? 'Salvando...' : 'Finalizar Relatório'}</button>
        </form>
      </div>
    );
  }

function renderHistoryList() {
  const filteredOrders = orders.filter(o => {
  if (historyFilter === 'pendentes') return o.status === 'Pendente';
  if (historyFilter === 'concluidas') return o.status === 'Concluída';
  return true;
});
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#2F2F2F]">
        Arquivo de Relatórios
      </h2>
<div className="flex gap-2">
  {[
    { id: 'todas', label: 'Todas' },
    { id: 'pendentes', label: 'Pendentes' },
    { id: 'concluidas', label: 'Concluídas' },
  ].map(filter => (
    <button
      key={filter.id}
      onClick={() => setHistoryFilter(filter.id)}
      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${
        historyFilter === filter.id
          ? 'bg-orange-600 text-white border-orange-600'
          : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
      }`}
    >
      {filter.label}
    </button>
  ))}
</div>
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100 shadow-sm">
        {filteredOrders.map(o => (
          <div
            key={o.id}
            className="p-5 flex flex-col md:flex-row md:justify-between md:items-center gap-4"
          >
            <div className="flex gap-4 items-center">
              <div className={`p-3 rounded-lg shadow-sm border ${o.osType === 'limpeza' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                <FileText size={20} />
              </div>

              <div>
                <h4 className="font-bold text-[#2F2F2F] text-base uppercase">
                  {o.client.name}
                </h4>
                <p className="text-xs text-zinc-500 font-medium mt-1 uppercase">
                  {new Date(o.createdAt).toLocaleDateString('pt-BR')} | Resp: {o.technician}
                </p>
                <span className={`inline-block mt-2 text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
    o.status === 'Pendente'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-green-100 text-green-700'
  }`}>
    {o.status || 'Concluída'}
  </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:flex md:flex-row gap-2 w-full md:w-auto">

{o.status === 'Pendente' && (
  <button
    onClick={() => {
      setEditingOrder(o);
      setSelectedClientId(o.clientId);
      setClientData(o.client);
      setChecklistItems(o.checklistItems || []);
      setObservations(o.observations || '');
      setMaterialsUsed(o.materialsUsed || '');
      setVisitType(o.visitType || 'preventiva');
      setOsType(o.osType || 'manutencao');
      setSelectedTechId(o.technicianId || '');
      setNeedsFollowUp(false);
      setCurrentView('new');
    }}
    className="w-full bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded-lg font-bold text-[11px] hover:bg-yellow-100 transition-all shadow-sm"
  >
    Finalizar OS
  </button>
)}

              <button
                onClick={() => {
                  setSelectedOrder(o);
                  setCurrentView('view');
                }}
                className="w-full bg-white border border-zinc-300 text-zinc-700 px-4 py-2 rounded-lg font-bold text-xs hover:bg-zinc-50 transition-all shadow-sm"
              >
                Visualizar
              </button>

              {isAdmin && (
                <button
                  onClick={async () => {
                    if (window.confirm('Tem certeza que deseja excluir esta OS? Essa ação não poderá ser desfeita.')) {
                      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'service_orders', o.id));
                      notify('OS excluída com sucesso.', 'success');
                    }
                  }}
                  className="w-full bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg font-bold text-xs hover:bg-red-100 transition-all shadow-sm"
                >
                  Excluir
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

  function renderViewOrder() {
  if (!selectedOrder) return null;

  const handlePrintPDF = () => {
    window.print();
  };

  const handleSendEmailClient = () => {
    if (!selectedOrder?.client?.email) {
      alert('Este cliente não possui e-mail cadastrado.');
      return;
    }

    const subject = encodeURIComponent(
      `Laudo Técnico #${selectedOrder.id.slice(0,8).toUpperCase()} - Manutec`
    );

    const body = encodeURIComponent(
`Olá ${selectedOrder.client.responsible || selectedOrder.client.name},

O laudo técnico de vistoria da sua unidade foi gerado.

Cliente: ${selectedOrder.client.name}
Data: ${new Date(selectedOrder.client.date + "T12:00:00").toLocaleDateString('pt-BR')}
Técnico: ${selectedOrder.technician}

Para salvar o laudo em PDF, clique em "Imprimir / Salvar PDF" no sistema.

Atenciosamente,
Equipe Manutec`
    );

    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${selectedOrder.client.email}&su=${subject}&body=${body}`,
      '_blank'
    );
  };

    return (
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-zinc-200 p-10 print-container text-[#2F2F2F] animate-in slide-in-from-bottom duration-500">
        <div className="absolute top-8 right-8 no-print flex gap-2"><button onClick={()=>setCurrentView('history')} className="p-2.5 bg-zinc-100 rounded-lg text-zinc-500 hover:text-[#2F2F2F] transition-all"><X size={20}/></button>{userRole !== 'cliente' && (<button onClick={handleSendEmailClient} className="flex items-center px-4 py-2.5 bg-zinc-800 text-white font-medium text-sm rounded-lg shadow-sm hover:bg-zinc-900 transition-all"><Mail size={16} className="mr-2"/>E-mail Rápido</button>)}<button onClick={handlePrintPDF} className="flex items-center px-5 py-2.5 bg-orange-600 text-white font-medium text-sm rounded-lg shadow-sm hover:bg-orange-700 transition-all"><Printer size={16} className="mr-2"/>Imprimir / Salvar PDF</button></div>
        <div className="flex justify-between items-start border-b-2 border-zinc-200 pb-6 mb-6 mt-2">
           <div><h1 className="text-3xl font-bold flex flex-col text-[#2F2F2F] leading-none uppercase">Manutec<span className="text-orange-600 text-lg mt-1">Soluções em Manutenção</span></h1><p className="text-zinc-500 text-xs mt-3 font-medium uppercase">
  {selectedOrder.osType === 'limpeza'
    ? 'Relatório de Limpeza e Conservação'
    : 'Laudo Técnico de Campo'}
</p></div>
           <div className="text-right pt-2">
  <p className="text-zinc-400 font-semibold text-[10px] uppercase tracking-widest mb-1">CÓDIGO DE RELATÓRIO</p>
  <p className="text-[#2F2F2F] font-bold text-sm bg-zinc-100 px-2 py-1 rounded inline-block">#{selectedOrder.id.slice(0,8).toUpperCase()}</p>
  <p className="text-zinc-500 font-medium text-xs mt-2 uppercase">Emitido em: {new Date(selectedOrder.client.date + "T12:00:00").toLocaleDateString('pt-BR')}</p>

  <div className="mt-2">
    <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
      selectedOrder.status === 'Pendente'
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-green-100 text-green-700'
    }`}>
      {selectedOrder.status || 'Concluída'}
    </span>
  </div>
</div>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-10">
           <div className="bg-zinc-50 p-5 rounded-xl border border-zinc-200"><p className="mb-1.5 text-zinc-400 text-[10px] font-semibold uppercase tracking-widest">Unidade Inspecionada</p><p className="text-lg text-[#2F2F2F] font-bold mb-1 uppercase">{selectedOrder.client.name}</p><p className="text-zinc-600 text-xs font-bold uppercase">{selectedOrder.client.address}</p><div className="flex items-center gap-1.5 mt-3 text-zinc-600 text-xs font-medium"><User size={14} className="text-orange-600"/> <span className="uppercase">Contato: {selectedOrder.client.responsible || 'Preposto'}</span></div></div>
           <div className="bg-zinc-50 p-5 rounded-xl border border-zinc-200"><p className="mb-1.5 text-zinc-400 text-[10px] font-semibold uppercase tracking-widest">
  {selectedOrder.osType === 'limpeza'
    ? 'Equipe Responsável'
    : 'Execução'}
</p><p className="text-lg text-[#2F2F2F] font-bold mb-1 uppercase">
  {selectedOrder.technician}
</p>

<p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
  {selectedOrder.osType === 'limpeza'
    ? 'Auxiliar Responsável'
    : 'Responsável Técnico'}
</p><div className="mt-3 flex flex-col gap-1.5"><p className="text-orange-600 font-medium text-xs uppercase">Visita: {selectedOrder.visitType.replace('_', ' ')}</p><p className="text-zinc-600 font-medium text-xs uppercase">Setor: {selectedOrder.osType === 'manutencao' ? 'Técnica' : 'Conservação e Limpeza'}</p></div></div>
        </div>
        {selectedOrder.visitType === 'avulsa' && (
           <div className="mb-10 bg-orange-50 p-5 rounded-xl border border-orange-200">
             <h4 className="text-sm font-bold text-orange-800 uppercase tracking-widest flex items-center gap-2 mb-4"><Zap size={16}/> Resumo do Serviço Avulso</h4>
             <div className="grid grid-cols-3 gap-6">
                <div><span className="text-[10px] text-orange-600/80 font-bold uppercase tracking-widest block mb-1">Valor Acordado</span><span className="text-base font-bold text-[#2F2F2F]">R$ {selectedOrder.avulsaPrice || 'Não informado'}</span></div>
                <div><span className="text-[10px] text-orange-600/80 font-bold uppercase tracking-widest block mb-1">Orçamento</span><span className={`text-sm font-bold ${selectedOrder.avulsaApproved ? 'text-green-700' : 'text-red-600'}`}>{selectedOrder.avulsaApproved ? 'Aprovado' : 'Não Aprovado'}</span></div>
                {selectedOrder.avulsaApproved && (<div><span className="text-[10px] text-orange-600/80 font-bold uppercase tracking-widest block mb-1">Status da Execução</span><span className="text-sm font-bold text-[#2F2F2F]">{selectedOrder.avulsaStatus === 'pendente_material' ? 'Pendente (Aguardando Material/Peça)' : 'Serviço Executado'}</span></div>)}
             </div>
           </div>
        )}
        {selectedOrder.needsFollowUp && (
           <div className="mb-8 p-5 border-2 border-red-200 rounded-xl bg-red-50 flex items-center gap-4"><AlertTriangle size={28} className="text-red-600 shrink-0" /><div><h4 className="text-sm font-bold text-red-800 uppercase tracking-widest mb-1">Atenção: Retorno Necessário</h4><p className="text-xs text-red-700 font-medium uppercase">Foi sinalizada a necessidade de um novo agendamento com reposição de peça(s) ou material adicional para a conclusão definitiva deste serviço.</p></div></div>
        )}
        <div className="space-y-8">
           {(() => {
              let answeredItems = [];
              if (selectedOrder.checklistItems) { answeredItems = selectedOrder.checklistItems.filter(i => i.task); }
              if (answeredItems.length === 0) return <p className="text-zinc-500 text-sm font-medium uppercase">Nenhum item registrado no checklist.</p>;
              const groupedByLocation = answeredItems.reduce((acc, item) => { const loc = item.location || 'Geral'; if (!acc[loc]) acc[loc] = []; acc[loc].push(item); return acc; }, {});
              return Object.keys(groupedByLocation).map((location, index) => (
                 <div key={index} className="break-inside-avoid">
                    <h4 className="font-bold text-[#2F2F2F] text-base border-b border-zinc-200 pb-2 mb-3 flex items-center gap-2 uppercase"><div className="w-1 h-3 bg-orange-600 rounded-full"></div>{location}</h4>
                    
                    <table className="w-full text-sm border-collapse table-fixed">
                       <tbody className="divide-y divide-zinc-100">
                          {groupedByLocation[location].map((i, idx) => (
                             <tr key={idx} className={i.status === 'repair' ? 'bg-red-50/50' : ''}>
                                <td className="py-3 pr-4 w-[35%] align-top break-words">
                                   <div className="font-semibold text-zinc-800 whitespace-pre-wrap uppercase">{i.task}</div>
                                   {i.dayOfWeek && <div className="text-zinc-500 text-[10px] mt-1 font-medium uppercase">Dia: {i.dayOfWeek}</div>}
                                </td>
                                <td className="py-3 pr-4 w-[45%] align-top break-words">
                                  <div>
  {i.notes ? (
    <div className="text-zinc-600 font-medium whitespace-pre-wrap leading-relaxed text-xs uppercase">
      {i.notes}
    </div>
  ) : (
    <span className="text-zinc-400 text-[10px] font-medium uppercase">
      Sem observações
    </span>
  )}

  {i.photos && i.photos.length > 0 && (
    <div className="grid grid-cols-2 gap-3 mt-4">
      {i.photos.map((photo, index) => (
        <img
          key={index}
          src={photo}
          alt={`Foto ${index + 1}`}
          className="w-full max-h-48 object-cover rounded-lg border border-zinc-200"
        />
      ))}
    </div>
  )}
</div>
                                </td>
                                <td className={`py-3 text-right font-semibold text-xs w-[20%] align-top uppercase ${i.status === 'ok' ? 'text-green-600' : (i.status==='repair'?'text-red-600':(i.status === 'na' ? 'text-zinc-500' : 'text-amber-500'))}`}>
                                  {selectedOrder.osType === 'limpeza' 
                                    ? (i.status === 'ok' ? 'Realizado' : i.status === 'repair' ? 'Não Realizado' : 'Pendente')
                                    : (i.status === 'ok' ? 'Conforme' : (i.status==='repair'?'Reparo':(i.status==='na' ? 'N/A' : 'Pendente')))
                                  }
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              ));
           })()}
        </div>
        {selectedOrder.materialsUsed && (<div className="mt-10 border border-orange-200 p-6 rounded-xl bg-orange-50/50"><h4 className="text-orange-800 font-bold text-sm mb-3 flex items-center gap-2 uppercase"><PackageOpen size={16}/> Peças e Insumos (Faturamento Extra)</h4><p className="text-sm text-zinc-800 whitespace-pre-wrap break-words font-medium uppercase">{selectedOrder.materialsUsed}</p></div>)}
        {selectedOrder.observations && (<div className="mt-8 p-6 border border-zinc-200 rounded-xl bg-zinc-50"><h4 className="text-sm font-bold mb-3 text-zinc-800 uppercase">Anotações do Diagnóstico</h4><p className="text-sm text-zinc-700 whitespace-pre-wrap break-words font-medium uppercase">{selectedOrder.observations}</p></div>)}
        <div className="grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-zinc-300 text-center">
           <div className="flex flex-col items-center"><div className="w-full border-b border-zinc-300 h-12 flex items-end justify-center mb-2 text-lg text-zinc-700 font-bold uppercase">{selectedOrder.technician}</div>{selectedOrder.osType === 'limpeza'
  ? 'ASSINATURA DO RESPONSÁVEL PELA EXECUÇÃO'
  : 'ASSINATURA TÉCNICA'}</div>
           <div className="flex flex-col items-center"><div className="w-full border-b border-zinc-300 h-12 flex items-end justify-center mb-2 relative">{selectedOrder.signature && <img src={selectedOrder.signature} className="max-h-full object-contain pb-1" alt="Assinatura Cliente"/>}</div><p className="text-zinc-800 font-semibold text-xs uppercase">{selectedOrder.client.name}</p>{selectedOrder.osType === 'limpeza'
  ? 'CONFERÊNCIA DO RESPONSÁVEL'
  : 'APROVAÇÃO DO CLIENTE'}</div>
        </div>
        <div className="mt-12 text-center border-t border-zinc-100 pt-4"><p className="text-[10px] text-zinc-400 font-medium uppercase">Manutec Soluções em Manutenção - Gerado eletronicamente.</p></div>
      </div>
    );
  }

  function renderClientsList() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-2 flex-wrap">
  <h2 className="text-2xl font-bold text-[#2F2F2F] uppercase">
    GESTÃO DE CONTRATOS
  </h2>
  <button
  type="button"
  onClick={() => setShowAddClientForm(true)}
  className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-700 transition-all"
>
  + Novo Cliente
</button>
  <button
    type="button"
    onClick={() => setShowInactiveClients(!showInactiveClients)}
    className="border border-zinc-300 px-4 py-2 rounded-lg text-sm font-bold text-[#2F2F2F] hover:bg-zinc-100 transition-all"
  >
    {showInactiveClients ? 'Ver Clientes Ativos' : 'Ver Clientes Inativos'}
  </button>
</div>

        {showAddClientForm && userRole === 'gestor' && (
          <form onSubmit={handleSaveClientManual} className="bg-white p-8 rounded-xl border border-zinc-200 space-y-6 shadow-md animate-in fade-in duration-200">
             <div className="flex items-center gap-3 border-b border-zinc-100 pb-4"><Building className="text-orange-600" size={20}/><h3 className="font-bold text-zinc-800 text-base uppercase">Registro de Nova Unidade</h3></div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2"><label className="block text-xs font-semibold text-[#2F2F2F] mb-1 uppercase">Razão Social da Empresa *</label><input required value={newClientEntry.name} onChange={e=>setNewClientEntry({...newClientEntry, name:e.target.value})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm font-medium text-[#2F2F2F] uppercase" /></div>
                <div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1 uppercase">CNPJ / CPF</label><input placeholder="00.000.000/0000-00" value={newClientEntry.cnpj} onChange={e=>setNewClientEntry({...newClientEntry, cnpj:e.target.value})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm text-[#2F2F2F] font-medium uppercase" /></div>
                <div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1 uppercase">Responsável / Síndico</label><input placeholder="Nome do Preposto" value={newClientEntry.responsible} onChange={e=>setNewClientEntry({...newClientEntry, responsible:e.target.value})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm text-[#2F2F2F] font-medium uppercase" /></div>
                <div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1 uppercase">Telefone de Contato</label><input placeholder="(00) 00000-0000" value={newClientEntry.phone} onChange={e=>setNewClientEntry({...newClientEntry, phone:e.target.value})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm text-[#2F2F2F] font-medium uppercase" /></div>
                <div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1 uppercase">Email para Envio de OS</label><input type="email" placeholder="operacional@empresa.com" value={newClientEntry.email} onChange={e=>setNewClientEntry({...newClientEntry, email:e.target.value})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm text-[#2F2F2F] font-medium" /></div>
                <div className="md:col-span-2"><label className="block text-xs font-semibold text-[#2F2F2F] mb-1 uppercase">Endereço Completo</label><input placeholder="Rua, Número, Complemento, Bairro" value={newClientEntry.address} onChange={e=>setNewClientEntry({...newClientEntry, address:e.target.value})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm text-[#2F2F2F] font-medium uppercase" /></div>
             </div>
             <div className="mt-6 pt-5 border-t border-zinc-200">
               <h4 className="font-bold text-zinc-800 text-sm mb-4 uppercase">Configuração Inicial de Contrato</h4>
               <div className="mb-4"><label className="block text-xs font-semibold text-[#2F2F2F] mb-1 uppercase">Descrição / Objeto do Contrato</label><textarea value={newClientEntry.contract?.description || ''} onChange={(e) => setNewClientEntry({...newClientEntry, contract: {...newClientEntry.contract, description: e.target.value}})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm text-[#2F2F2F] resize-y font-bold uppercase" rows="2" placeholder="EX: CONTRATO INTEGRAL..."></textarea></div>
               <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 mb-4"><div className="flex items-center gap-2 mb-3"><input type="checkbox" id="hasManutencao" checked={newClientEntry.contract?.hasManutencao} onChange={(e) => setNewClientEntry({...newClientEntry, contract: {...newClientEntry.contract, hasManutencao: e.target.checked}})} className="w-4 h-4 accent-orange-600 cursor-pointer" /><label htmlFor="hasManutencao" className="text-sm font-semibold text-[#2F2F2F] cursor-pointer uppercase">Contrato de Manutenção (Preventiva/Corretiva)</label></div>{newClientEntry.contract?.hasManutencao && (<div className="grid grid-cols-2 gap-4 pl-6"><div><label className="block text-[10px] font-semibold text-zinc-500 mb-1 uppercase">Visitas Preventivas (Mensais)</label><input type="number" min="0" value={newClientEntry.contract?.preventiva?.total} onChange={(e) => setNewClientEntry({...newClientEntry, contract: {...newClientEntry.contract, preventiva: { total: parseInt(e.target.value) || 0, used: 0 }}})} className="w-20 p-2 border border-zinc-300 rounded-lg text-sm font-medium outline-none focus:border-orange-500" /></div><div><label className="block text-[10px] font-semibold text-zinc-500 mb-1 uppercase">Chamados Emergenciais (Mensais)</label><input type="number" min="0" value={newClientEntry.contract?.emergencial?.total} onChange={(e) => setNewClientEntry({...newClientEntry, contract: {...newClientEntry.contract, emergencial: { total: parseInt(e.target.value) || 0, used: 0 }}})} className="w-20 p-2 border border-zinc-300 rounded-lg text-sm font-medium outline-none focus:border-orange-500" /></div></div>)}</div>
               <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200"><div className="flex items-center gap-2 mb-3"><input type="checkbox" id="hasLimpeza" checked={newClientEntry.contract?.hasLimpeza} onChange={(e) => setNewClientEntry({...newClientEntry, contract: {...newClientEntry.contract, hasLimpeza: e.target.checked}})} className="w-4 h-4 accent-orange-600 cursor-pointer" /><label htmlFor="hasLimpeza" className="text-sm font-semibold text-[#2F2F2F] cursor-pointer uppercase">Contrato de Conservação e Limpeza</label></div>{newClientEntry.contract?.hasLimpeza && (<div className="pl-6"><label className="block text-[10px] font-semibold text-zinc-500 mb-1 uppercase">Frequência Semanal (Dias)</label><select value={newClientEntry.contract?.limpezaDays} onChange={(e) => setNewClientEntry({...newClientEntry, contract: {...newClientEntry.contract, limpezaDays: parseInt(e.target.value)}})} className="w-48 p-2 border border-zinc-300 rounded-lg text-sm font-medium outline-none focus:border-orange-500 uppercase tracking-widest"><option value={1}>1 Dia / Semana</option><option value={2}>2 Dias / Semana</option><option value={3}>3 Dias / Semana</option><option value={4}>4 Dias / Semana</option><option value={5}>5 Dias / Semana</option><option value={6}>6 Dias / Semana</option><option value={7}>Todos os dias</option></select></div>)}</div>
             </div>
             <div className="flex gap-3 pt-4 border-t border-zinc-100"><button type="submit" disabled={isSubmitting} className="flex-1 bg-orange-600 text-white py-2.5 rounded-lg font-medium text-sm shadow-sm hover:bg-orange-700 transition-colors uppercase">Salvar Unidade e Contrato</button><button type="button" onClick={()=>setShowAddClientForm(false)} className="px-6 border border-zinc-300 text-zinc-600 font-medium text-sm rounded-lg hover:bg-zinc-50 transition-colors uppercase">Cancelar</button></div>
          </form>
        )}
        <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100 shadow-sm overflow-hidden">
        {clients
  .filter(c => showInactiveClients ? c.active === false : c.active !== false)
  .map(c => {
            const hasManutencao = c.contract?.hasManutencao; const hasLimpeza = c.contract?.hasLimpeza;
            const p = getClientQuotaHealth(c.contract, 'preventiva'); const e = getClientQuotaHealth(c.contract, 'emergencial'); 
            return (
              <div key={c.id} className="p-5 flex flex-col lg:flex-row justify-between gap-5 hover:bg-zinc-50 transition-colors group">
                <div><h4 className="font-bold text-[#2F2F2F] text-base uppercase">{c.name}</h4><div className="flex flex-col gap-1 mt-1.5"><p className="text-xs text-zinc-500 font-medium flex items-center uppercase"><MapPin size={14} className="mr-1.5 text-zinc-400"/> {c.address}</p><p className="text-xs text-zinc-500 font-medium flex items-center"><Mail size={14} className="mr-1.5 text-zinc-400"/> {c.email || 'SEM E-MAIL'}</p><p className="text-xs text-zinc-500 font-medium flex items-center uppercase"><Phone size={14} className="mr-1.5 text-zinc-400"/> {c.phone || 'SEM TELEFONE'}</p></div></div>
                {userRole === 'gestor' && (
                   <div className="flex gap-4 items-center self-end lg:self-center border-t lg:border-t-0 lg:border-l border-zinc-100 pt-4 lg:pt-0 lg:pl-5">
                     <div className="flex flex-col gap-2">
                       {hasManutencao ? (<div className="flex gap-2"><div className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border flex items-center gap-1 uppercase ${p.color}`}><Wrench size={10}/> Prev: {p.text}</div><div className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border flex items-center gap-1 uppercase ${e.color}`}><AlertTriangle size={10}/> Emerg: {e.text}</div></div>) 
                       : (<div className="px-2.5 py-1 rounded-md text-[10px] font-medium border border-zinc-200 text-zinc-500 bg-zinc-50 flex items-center gap-1 uppercase"><Wrench size={10}/> Sem Contrato Manutenção</div>)}
                       {hasLimpeza ? (<div className="px-2.5 py-1 rounded-md text-[10px] font-semibold border border-blue-200 bg-blue-50 text-blue-700 flex items-center gap-1 w-fit uppercase"><Sparkles size={10}/> Limpeza: {c.contract?.limpezaDays}x na Semana</div>) 
                       : (<div className="px-2.5 py-1 rounded-md text-[10px] font-medium border border-zinc-200 text-zinc-500 bg-zinc-50 flex items-center gap-1 w-fit uppercase"><Sparkles size={10}/> Sem Contrato Limpeza</div>)}
                       {c.contract?.description && (<div className="mt-1 text-[10px] text-zinc-500 italic max-w-[200px] break-words uppercase font-bold">"{c.contract.description}"</div>)}
                     </div>
                     <button onClick={()=>{ setEditingClient(c); setContractData({ hasManutencao: c.contract?.hasManutencao ?? true, hasLimpeza: c.contract?.hasLimpeza ?? false, preventiva: c.contract?.preventiva || { total: 1, used: 0 }, emergencial: c.contract?.emergencial || { total: 2, used: 0 }, limpezaDays: c.contract?.limpezaDays || 5, description: c.contract?.description || '' }); setShowContractModal(true); }} className="p-2 border border-zinc-200 rounded-md text-zinc-500 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 transition-all shadow-sm"><Edit size={16}/></button>
                   {isAdmin && (
  <button
    onClick={async () => {
      if (window.confirm('Deseja inativar este cliente?')) {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'clients', c.id),
          { active: false }
        );

        notify('Cliente inativado com sucesso.', 'success');
      }
    }}
    className="p-2 border border-yellow-200 rounded-md text-yellow-700 hover:bg-yellow-50 transition-all shadow-sm"
  >
    Inativar
  </button>
)}
                   </div>
                )}
              </div>
            );
            })}
        </div>
        {showContractModal && editingClient && userRole === 'gestor' && (
          <div className="fixed inset-0 bg-zinc-900/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-5 border-t-4 border-orange-600 max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center border-b border-zinc-100 pb-3"><h3 className="font-bold text-[#2F2F2F] text-sm uppercase">{editingClient.name}</h3><button onClick={()=>setShowContractModal(false)} className="text-zinc-400 hover:text-zinc-800 transition-colors"><X size={20}/></button></div>
               <div className="space-y-4">
                  <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200"><label className="block text-xs font-semibold text-[#2F2F2F] mb-2 uppercase tracking-widest">Descrição / Objeto do Contrato</label><textarea value={contractData.description} onChange={e=>setContractData({...contractData, description: e.target.value})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm text-[#2F2F2F] resize-y font-bold uppercase" rows="3" placeholder="EX: CONTRATO INTEGRAL..."></textarea></div>
                  <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                    <div className="flex items-center gap-2 mb-3 border-b border-zinc-200 pb-2"><input type="checkbox" id="editHasManutencao" checked={contractData.hasManutencao} onChange={(e) => setContractData({...contractData, hasManutencao: e.target.checked})} className="w-4 h-4 accent-orange-600 cursor-pointer" /><label htmlFor="editHasManutencao" className="text-xs font-bold text-[#2F2F2F] cursor-pointer flex items-center gap-1 uppercase"><Wrench size={14} className="text-zinc-500"/> Contrato de Manutenção</label></div>
                    {contractData.hasManutencao && (<div className="space-y-2"><div className="flex justify-between items-center"><div><p className="text-[10px] font-medium text-zinc-500 uppercase">Visitas Mensais</p><p className="text-xs font-semibold text-[#2F2F2F] uppercase">Preventivas</p></div><input type="number" value={contractData.preventiva.total} onChange={e=>setContractData({...contractData, preventiva:{...contractData.preventiva, total:parseInt(e.target.value)}})} className="border border-zinc-300 p-1.5 w-16 rounded-md text-center font-bold text-sm outline-none focus:border-orange-500" /></div><div className="flex justify-between items-center"><div><p className="text-[10px] font-medium text-zinc-500 uppercase">SLA 4h</p><p className="text-xs font-semibold text-[#2F2F2F] uppercase">Emergenciais</p></div><input type="number" value={contractData.emergencial.total} onChange={e=>setContractData({...contractData, emergencial:{...contractData.emergencial, total:parseInt(e.target.value)}})} className="border border-zinc-300 p-1.5 w-16 rounded-md text-center font-bold text-sm outline-none focus:border-orange-500" /></div></div>)}
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                    <div className="flex items-center gap-2 mb-3 border-b border-zinc-200 pb-2"><input type="checkbox" id="editHasLimpeza" checked={contractData.hasLimpeza} onChange={(e) => setContractData({...contractData, hasLimpeza: e.target.checked})} className="w-4 h-4 accent-orange-600 cursor-pointer" /><label htmlFor="editHasLimpeza" className="text-xs font-bold text-[#2F2F2F] cursor-pointer flex items-center gap-1 uppercase"><Sparkles size={14} className="text-zinc-500"/> Contrato de Limpeza</label></div>
                    {contractData.hasLimpeza && (<div className="flex justify-between items-center"><div><p className="text-[10px] font-medium text-zinc-500 uppercase">Frequência</p><p className="text-xs font-semibold text-[#2F2F2F] uppercase">Dias na Semana</p></div><select value={contractData.limpezaDays} onChange={(e) => setContractData({...contractData, limpezaDays: parseInt(e.target.value)})} className="p-1.5 border border-zinc-300 rounded-md text-xs font-medium outline-none focus:border-orange-500 uppercase"><option value={1}>1 Dia</option><option value={2}>2 Dias</option><option value={3}>3 Dias</option><option value={4}>4 Dias</option><option value={5}>5 Dias</option><option value={6}>6 Dias</option><option value={7}>7 Dias</option></select></div>)}
                  </div>
               </div>
               <button onClick={handleUpdateContract} className="w-full py-2.5 bg-[#2F2F2F] text-white font-medium text-sm rounded-lg shadow-sm hover:bg-zinc-800 transition-all mt-2 uppercase">Salvar Alterações</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderTechniciansList() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-2 flex-wrap">
  <h2 className="text-2xl font-bold text-[#2F2F2F] uppercase">
    Equipe Técnica
  </h2>

  {isAdmin && (
    <button
      type="button"
      onClick={() => setShowAddTechForm(true)}
      className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center shadow-sm text-sm font-medium hover:bg-orange-700 transition-all"
    >
      <PlusCircle size={18} className="mr-2" />
      Novo Colaborador
    </button>
  )}
</div>
        {showAddTechForm && (
          <form onSubmit={handleSaveTechnician} className="bg-white p-6 rounded-xl border border-zinc-200 space-y-5 shadow-sm animate-in fade-in duration-200">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2"><label className="block text-xs font-semibold text-[#2F2F2F] mb-1 uppercase">Nome Completo / Empresa *</label><input required value={newTechData.name} onChange={e=>setNewTechData({...newTechData, name:e.target.value})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 font-medium text-sm text-[#2F2F2F] uppercase" /></div>
                <div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1 uppercase">Especialidade</label><select value={newTechData.specialty} onChange={e=>setNewTechData({...newTechData, specialty:e.target.value})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm text-[#2F2F2F] font-medium uppercase"><option value="Manutenção">Manutenção Predial</option><option value="Limpeza">Conservação / Limpeza</option><option value="Sistemas Críticos">Especialista (Chiller/AC)</option></select></div>
                <div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1 uppercase">Tipo de Contrato</label><select value={newTechData.type} onChange={e=>setNewTechData({...newTechData, type:e.target.value, document:''})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm text-[#2F2F2F] font-medium uppercase"><option value="PF">CLT / Pessoa Física</option><option value="PJ">Terceirizado (CNPJ)</option></select></div>
                <div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1 uppercase">Documento</label><input placeholder="CPF ou CNPJ" value={newTechData.document} onChange={e=>setNewTechData({...newTechData, document:e.target.value})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm text-[#2F2F2F] uppercase" /></div>
                <div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1 uppercase">Telefone</label><input placeholder="(00) 00000-0000" value={newTechData.phone} onChange={e=>setNewTechData({...newTechData, phone:e.target.value})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm text-[#2F2F2F] font-medium uppercase" /></div>
                <div><label className="block text-xs font-semibold text-[#2F2F2F] mb-1 uppercase">E-mail Corporativo / Pessoal</label><input type="email" placeholder="tecnico@empresa.com" value={newTechData.email} onChange={e=>setNewTechData({...newTechData, email:e.target.value})} className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg outline-none focus:border-orange-500 text-sm text-[#2F2F2F] font-medium" /></div>
             </div>
             <div className="flex gap-3 pt-2"><button type="submit" className="flex-1 bg-[#2F2F2F] text-white py-2.5 rounded-lg font-medium text-sm shadow-sm hover:bg-zinc-800 transition-colors uppercase">Cadastrar</button><button type="button" onClick={()=>setShowAddTechForm(false)} className="px-6 border border-zinc-300 text-zinc-600 font-medium text-sm rounded-lg hover:bg-zinc-50 transition-colors uppercase">Cancelar</button></div>
          </form>
        )}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100 shadow-sm">{technicians.map(t => (
            <div key={t.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-50 transition-colors">
              <div className="flex gap-4 items-center">
                <div className={`p-3 rounded-xl ${t.specialty === 'Limpeza' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>{t.specialty === 'Limpeza' ? <Sparkles size={20}/> : <Briefcase size={20}/>}</div>
                <div><h4 className="font-bold text-[#2F2F2F] text-base uppercase">{t.name} <span className="ml-2 text-[10px] bg-zinc-200 px-2 py-0.5 rounded-md text-zinc-600 font-medium uppercase">{t.type}</span></h4><p className="text-xs text-zinc-500 font-medium mt-1 uppercase">{t.specialty}</p></div>
              </div>
              <div className="text-xs text-zinc-500 font-medium flex flex-wrap items-center gap-4 md:gap-6 self-end md:self-center justify-end uppercase font-bold">
                <span className="flex items-center gap-1.5"><Mail size={14} className="text-zinc-400"/> {t.email || 'SEM E-MAIL'}</span>
                <span className="flex items-center gap-1.5"><Phone size={14} className="text-zinc-400"/> {t.phone || '---'}</span>
                <span className="flex items-center gap-1.5"><CreditCard size={14} className="text-zinc-400"/> {t.document || '---'}</span>
              </div>
             {isAdmin && (
  <button
    onClick={() => alert('Admin reconhecido na Equipe')}
    className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs self-end md:self-center"
  >
    Excluir
  </button>
)}
            </div>
        ))}</div>
      </div>
          );
  }
  function renderTechnicianView() {
  const todaySchedules = schedules
    .filter(s => s.status !== 'Concluído')
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-24">
      
      <div className="bg-[#2F2F2F] text-white rounded-2xl p-5 shadow-md">
        <h2 className="text-xl font-bold">
          Olá, {user?.email?.split('@')[0]} 👋
        </h2>
        <p className="text-zinc-300 text-sm mt-1">
          Suas próximas atividades
        </p>
      </div>

      <div className="space-y-3">
        {todaySchedules.length === 0 && (
          <p className="text-zinc-500 text-sm">Nenhuma atividade pendente</p>
        )}

        {todaySchedules.map(s => {
          const client = clients.find(c => c.id === s.clientId);

          return (
            <div
              key={s.id}
              className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm"
            >
              <p className="text-sm font-bold text-[#2F2F2F]">
                {client?.name}
              </p>

              <p className="text-xs text-zinc-500 mt-1">
                {s.date} • {s.time}
              </p>

              <button
                onClick={() => {
                  setSelectedSchedule(s);
                  setCurrentView('new');
                }}
                className="mt-3 w-full bg-orange-600 text-white py-2 rounded-lg text-sm font-bold"
              >
                Iniciar OS
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
}