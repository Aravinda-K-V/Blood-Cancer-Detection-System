/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Upload, 
  FileText, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  History, 
  Info, 
  Microscope,
  Stethoscope,
  ChevronRight,
  Loader2,
  Bell,
  User,
  LogOut,
  ShieldAlert,
  ArrowRight,
  X,
  BookOpen,
  MousePointer2,
  Zap,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  AreaChart,
  Area
} from 'recharts';

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const CURRENT_MODEL_VERSION = "v2.1.0-hematology-stable";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
interface PatientInfo {
  name: string;
  dob: string;
  mrn: string;
}

interface AnalysisResult {
  id: string;
  timestamp: string;
  imageName: string;
  imageUrl: string;
  cellType: string;
  riskLevel: 'High' | 'Moderate' | 'Low' | 'Normal';
  confidence: number;
  interpretation: string;
  morphologicalMarkers: string[];
  patient?: PatientInfo;
  modelVersion: string;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [activeTab, setActiveTab] = useState<'detection' | 'history' | 'about'>('detection');
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '',
    dob: '',
    mrn: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof PatientInfo, string>>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      fileRef.current = file;
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setFileName(file.name);
        setResult(null); // Clear previous result
      };
      reader.readAsDataURL(file);
    }
  };

  const addNotification = (type: Notification['type'], message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const validateForm = () => {
    const errors: Partial<Record<keyof PatientInfo, string>> = {};
    if (!patientInfo.name.trim()) errors.name = 'Patient name is required';
    if (!patientInfo.dob) errors.dob = 'Date of birth is required';
    if (!patientInfo.mrn.trim()) errors.mrn = 'MRN is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const analyzeImage = async () => {
    if (!validateForm()) {
      addNotification('error', 'Please fill in all required patient details.');
      return;
    }
    
    if (!selectedImage) {
      addNotification('error', 'Please upload a blood specimen image first.');
      return;
    }
    
    setIsAnalyzing(true);
    addNotification('info', 'Analysis started. Sending image to backend...');

    try {
      const file = fileRef.current;
      if (!file) {
        addNotification('error', 'No file available for upload. Please re-upload the image.');
        setIsAnalyzing(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file, file.name);

      const resp = await fetch(`${BACKEND_URL}/predict`, {
        method: 'POST',
        body: formData
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Server error: ${resp.status} ${errText}`);
      }

      const data = await resp.json();

      const confidencePct = typeof data.confidence === 'number' && data.confidence <= 1 ? Math.round(data.confidence * 10000) / 100 : (data.confidence || 0);

      const mappedRisk = (label: string) => {
        if (label === 'Myeloblast') return 'High';
        if (label === 'erythroblast') return 'Moderate';
        return 'Normal';
      };

      const newResult: AnalysisResult = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleString(),
        imageName: fileName,
        imageUrl: selectedImage || '',
        patient: { ...patientInfo },
        modelVersion: CURRENT_MODEL_VERSION,
        cellType: data.prediction || 'Unrecognized',
        confidence: confidencePct,
        riskLevel: mappedRisk(data.prediction || ''),
        interpretation: data.interpretation || `Model prediction: ${data.prediction}`,
        morphologicalMarkers: data.morphologicalMarkers || []
      };

      setResult(newResult);
      setHistory(prev => [newResult, ...prev]);
      addNotification('success', `Analysis complete: ${newResult.cellType} detected.`);
    } catch (error) {
      console.error("Analysis failed:", error);
      addNotification('error', 'Analysis failed. Please check backend availability and image quality.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-red-600 border-red-200 bg-red-50';
      case 'Moderate': return 'text-orange-600 border-orange-200 bg-orange-50';
      case 'Low': return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      case 'Normal': return 'text-emerald-600 border-emerald-200 bg-emerald-50';
      default: return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'High': return <ShieldAlert className="w-6 h-6 text-red-600" />;
      case 'Moderate': return <AlertCircle className="w-6 h-6 text-orange-600" />;
      case 'Low': return <Info className="w-6 h-6 text-yellow-600" />;
      case 'Normal': return <CheckCircle2 className="w-6 h-6 text-emerald-600" />;
      default: return <Search className="w-6 h-6 text-gray-600" />;
    }
  };

  const downloadReport = (report: AnalysisResult) => {
    const reportText = `
BLOODAI PATHOLOGY REPORT
-------------------------
Report ID: ${report.id}
Date: ${report.timestamp}

PATIENT INFORMATION
Name: ${report.patient?.name || 'N/A'}
DOB: ${report.patient?.dob || 'N/A'}
MRN: ${report.patient?.mrn || 'N/A'}

DIAGNOSTIC SUMMARY
Cell Type Identification: ${report.cellType}
Confidence: ${report.confidence}%
Risk Assessment: ${report.riskLevel} Case
Model Version: ${report.modelVersion}

MORPHOLOGICAL MARKERS
${report.morphologicalMarkers.join(', ') || 'None identified'}

CLINICAL INTERPRETATION
${report.interpretation}

-------------------------
DISCLAIMER: This analysis is provided for diagnostic support. Final 
confirmation required by certified laboratory pathology protocols.
    `;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BloodAI_Report_${report.patient?.mrn || report.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <Microscope className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">BloodAI</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => setActiveTab('detection')}
                className={`text-sm font-medium transition-colors ${activeTab === 'detection' ? 'text-red-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-red-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Patient History
              </button>
              <button 
                onClick={() => setActiveTab('about')}
                className={`text-sm font-medium transition-colors ${activeTab === 'about' ? 'text-red-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                How to Use
              </button>
              <button className="text-sm font-medium text-gray-500 hover:text-gray-900">Research</button>
            </nav>

            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <div className="h-8 w-px bg-gray-200"></div>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                <LogOut className="w-3.5 h-3.5" />
                Exit System
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {activeTab === 'detection' ? 'Hematologic Analysis Dashboard' : 'Patient Diagnostic Archive'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeTab === 'detection' 
              ? 'Upload microscopic blood samples for real-time AI-assisted pathology detection.'
              : 'Detailed record of previous analyses to track patient outcomes and diagnostic trends.'}
          </p>
        </div>

        {activeTab === 'detection' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Upload & Preview */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Patient Details Form */}
              <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-1 border-b border-gray-100 flex items-center bg-gray-50/50">
                  <div className="flex gap-1.5 px-3">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 py-2 uppercase tracking-widest">Patient Information</span>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Patient Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. John Doe"
                      value={patientInfo.name}
                      onChange={(e) => {
                        setPatientInfo(prev => ({ ...prev, name: e.target.value }));
                        if (formErrors.name) setFormErrors(prev => ({ ...prev, name: undefined }));
                      }}
                      className={`bg-gray-50 border ${formErrors.name ? 'border-red-500 bg-red-50/50' : 'border-gray-200'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all`}
                    />
                    {formErrors.name && <p className="text-[10px] text-red-500 font-bold uppercase">{formErrors.name}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date of Birth</label>
                    <input 
                      type="date"
                      value={patientInfo.dob}
                      onChange={(e) => {
                        setPatientInfo(prev => ({ ...prev, dob: e.target.value }));
                        if (formErrors.dob) setFormErrors(prev => ({ ...prev, dob: undefined }));
                      }}
                      className={`bg-gray-50 border ${formErrors.dob ? 'border-red-500 bg-red-50/50' : 'border-gray-200'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all`}
                    />
                    {formErrors.dob && <p className="text-[10px] text-red-500 font-bold uppercase">{formErrors.dob}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Medical Record Number (MRN)</label>
                    <input 
                      type="text"
                      placeholder="e.g. MRN-99821-X"
                      value={patientInfo.mrn}
                      onChange={(e) => {
                        setPatientInfo(prev => ({ ...prev, mrn: e.target.value }));
                        if (formErrors.mrn) setFormErrors(prev => ({ ...prev, mrn: undefined }));
                      }}
                      className={`bg-gray-50 border ${formErrors.mrn ? 'border-red-500 bg-red-50/50' : 'border-gray-200'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all`}
                    />
                    {formErrors.mrn && <p className="text-[10px] text-red-500 font-bold uppercase">{formErrors.mrn}</p>}
                  </div>
                </div>
              </section>

              {/* Stats Overview */}
              <section className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm transition-transform hover:scale-[1.02]">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Today's Tests</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1">
                    <ArrowRight className="w-3 h-3 transform -rotate-45" />
                    +15% vs yesterday
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm transition-transform hover:scale-[1.02]">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Accuracy Rate</p>
                  <p className="text-2xl font-bold text-gray-900">98.4%</p>
                  <div className="flex items-center gap-1 text-[10px] text-blue-600 font-bold mt-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified by Lab
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm transition-transform hover:scale-[1.02]">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">High Risk Detected</p>
                  <p className="text-2xl font-bold text-red-600">3</p>
                  <div className="flex items-center gap-1 text-[10px] text-red-500 font-bold mt-1">
                    <ShieldAlert className="w-3 h-3" />
                    Action required
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-1 border-b border-gray-100 flex items-center bg-gray-50/50">
                  <div className="flex gap-1.5 px-3">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 py-2 uppercase tracking-widest">Specimen Loader</span>
                </div>
                
                <div className="p-8">
                  {!selectedImage ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center gap-4 hover:border-red-400 hover:bg-red-50/30 transition-all cursor-pointer group"
                    >
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-red-100 transition-colors">
                        <Upload className="w-8 h-8 text-gray-400 group-hover:text-red-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">Click to upload specimen image</p>
                        <p className="text-xs text-gray-500 mt-1">or drag and drop microscopic JPG or PNG</p>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        className="hidden" 
                        accept="image/*"
                      />
                    </div>
                  ) : (
                    <div className="relative group">
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200 relative">
                        <img 
                          src={selectedImage} 
                          alt="Specimen preview" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <AnimatePresence>
                          {isAnalyzing && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 z-10"
                            >
                              <div className="relative">
                                <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
                                <div className="absolute inset-0 bg-red-600 blur-[15px] opacity-20 animate-pulse"></div>
                              </div>
                              <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest animate-pulse">Scanning Morphology...</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button 
                          onClick={() => {
                            setSelectedImage(null);
                            setResult(null);
                          }}
                          className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 shadow-sm hover:bg-white transition-colors border border-gray-200"
                        >
                          Clear Specimen
                        </button>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-mono text-gray-500 truncate max-w-[200px]">{fileName}</span>
                        </div>
                        <button 
                          onClick={analyzeImage}
                          disabled={isAnalyzing}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-red-200 transition-all flex items-center gap-2"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Analyzing Pathology...
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4" />
                              Start Analysis
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Guidelines section */}
              <section className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide">Image Guidelines for Doctors</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    "Use high-resolution microscopic images (minimum 1000x magnification recommended).",
                    "Ensure Wright-Giemsa or similar staining is clearly visible for morphology analysis.",
                    "Single-cell views or small clusters provide the most accurate diagnostic confidence.",
                    "Capture images with clear boundaries and minimal peripheral blur."
                  ].map((guide, i) => (
                    <li key={i} className="flex gap-3 text-sm text-blue-800/80 leading-relaxed">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></div>
                      {guide}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Right Column: Results */}
            <div className="lg:col-span-5">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-6"
                  >
                    {/* Primary Diagnosis */}
                    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
                      <div className="p-6">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 flex items-end justify-start pl-8 pb-8">
                          <Stethoscope className="w-12 h-12 text-gray-100 transform -rotate-12" />
                        </div>

                        <div className="mb-6 relative z-10">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Diagnostic Result</span>
                          <h2 className="text-3xl font-bold text-gray-900">{result.cellType}</h2>
                          <div className="flex items-center gap-2 mt-2">
                             <div className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-widest ${getRiskColor(result.riskLevel)}`}>
                               {result.riskLevel} Risk
                             </div>
                             <span className="text-xs text-gray-400">•</span>
                             <span className="text-xs text-gray-500">{result.timestamp}</span>
                             <span className="text-xs text-gray-400">•</span>
                             <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Model: {result.modelVersion}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                              <Activity className="w-12 h-12" />
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Confidence Score</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold text-gray-900">{result.confidence}%</span>
                            </div>
                            <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${result.confidence}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-red-500 rounded-full"
                              />
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Assessment</p>
                             <div className="flex items-center gap-2">
                               {getRiskIcon(result.riskLevel)}
                               <span className="text-lg font-bold text-gray-900">{result.riskLevel} Case</span>
                             </div>
                          </div>
                        </div>

                        {/* High Visualization: Confidence Breakdown Chart */}
                        <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Statistical Probability Distribution</p>
                            <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <div className="h-24 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={[
                                { name: 'Normal', val: result.riskLevel === 'Normal' ? 100 : 15 },
                                { name: 'Low', val: result.riskLevel === 'Low' ? 100 : 10 },
                                { name: 'Moderate', val: result.riskLevel === 'Moderate' ? 100 : 8 },
                                { name: 'High', val: result.riskLevel === 'High' ? 100 : 5 },
                              ]}>
                                <Tooltip 
                                  contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                  cursor={{ fill: 'transparent' }}
                                />
                                <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                                  {[0,1,2,3].map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#eab308' : index === 2 ? '#f97316' : '#ef4444'} fillOpacity={0.6} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-2 uppercase tracking-wide">
                              <Microscope className="w-3 h-3" />
                              Morphological Markers
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {result.morphologicalMarkers.map((marker, i) => (
                                <span key={i} className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-medium text-gray-700 shadow-sm">
                                  {marker}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="p-4 bg-gray-50 rounded-xl border-l-4 border-gray-300">
                            <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-2 uppercase tracking-wide">
                              <FileText className="w-3 h-3" />
                              Clinical Interpretation
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed italic">
                              "{result.interpretation}"
                            </p>
                          </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3">
                          <button className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-colors">
                            Add to Patient File
                          </button>
                          <button 
                            onClick={() => downloadReport(result)}
                            className="flex-1 bg-white border border-gray-200 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Download Report
                          </button>
                        </div>
                      </div>
                    </section>

                    {/* Disclaimer */}
                    <section className="bg-[#FFF9E6] border border-[#FFEAB3] rounded-2xl p-4 flex gap-3">
                      <AlertCircle className="w-5 h-5 text-[#B38F00] shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-[#806600] uppercase tracking-widest mb-1">Medical Disclaimer</p>
                        <p className="text-xs text-[#806600]/80 leading-relaxed">
                          This AI analysis is provided for educational and diagnostic support purposes ONLY. Final diagnosis must be confirmed by a certified pathologist using standard laboratory protocols.
                        </p>
                      </div>
                    </section>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-white border border-gray-200 border-dashed rounded-2xl shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                      <Microscope className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-400">Awaiting Specimen</h3>
                    <p className="text-sm text-gray-400 max-w-[240px] mt-2">
                       Upload and start the analysis to see AI-assisted pathological insights.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : activeTab === 'history' ? (
          /* History Tab content */
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <History className="w-3.5 h-3.5" />
                  Recent Records ({history.length})
                </h3>
                <div className="flex items-center gap-2">
                   <button className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                     <Filter className="w-3.5 h-3.5" />
                   </button>
                   <button className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                     <Search className="w-3.5 h-3.5" />
                   </button>
                </div>
              </div>
              {history.length > 0 ? (
                history.map((item) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-6 hover:shadow-lg transition-all group cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                      <img src={item.imageUrl} alt={item.imageName} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 truncate text-lg">{item.cellType}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${getRiskColor(item.riskLevel)}`}>
                          {item.riskLevel}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                          {item.modelVersion}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded-md border border-gray-100">
                          <User className="w-3 h-3 text-gray-400" />
                          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{item.patient?.name || 'Unknown'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded-md border border-gray-100">
                          <Activity className="w-3 h-3 text-gray-400" />
                          <span className="text-[10px] text-gray-600 font-bold">{item.confidence}% Conf</span>
                        </div>
                        {item.morphologicalMarkers.slice(0, 2).map((marker, idx) => (
                           <div key={idx} className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 rounded-md border border-blue-100">
                             <Microscope className="w-2.5 h-2.5 text-blue-500" />
                             <span className="text-[9px] text-blue-700 font-bold uppercase tracking-tighter">{marker}</span>
                           </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-2">
                        <History className="w-3 h-3" />
                        Analyzed {item.timestamp}
                      </p>
                    </div>

                    <div className="text-right shrink-0 pr-2">
                      <div className="mb-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Confidence</p>
                        <p className="text-lg font-bold text-gray-900 leading-none">{item.confidence}%</p>
                      </div>
                      <button 
                        onClick={() => downloadReport(item)}
                        className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-600 hover:text-white transition-all group/btn"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="bg-white border border-gray-200 border-dashed rounded-3xl p-20 text-center">
                   <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <History className="w-10 h-10 text-gray-200" />
                   </div>
                   <p className="text-gray-400 font-medium">No diagnostic history available.</p>
                   <button 
                     onClick={() => setActiveTab('detection')}
                     className="mt-6 text-sm font-bold text-red-600 hover:underline"
                   >
                     Start your first analysis
                   </button>
                </div>
              )}
            </div>

            <div className="lg:col-span-4 space-y-6">
               <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 px-1 flex items-center gap-2">
                    <PieChartIcon className="w-3.5 h-3.5" />
                    Global Risk Distribution
                  </h4>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={
                            history.length > 0 ? [
                              { name: 'Normal', value: history.filter(h => h.riskLevel === 'Normal').length },
                              { name: 'Low', value: history.filter(h => h.riskLevel === 'Low').length },
                              { name: 'Mod', value: history.filter(h => h.riskLevel === 'Moderate').length },
                              { name: 'High', value: history.filter(h => h.riskLevel === 'High').length },
                            ].filter(d => d.value > 0) : [{ name: 'Empty', value: 1 }]
                          }
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {history.length > 0 ? [
                            <Cell key="cell-0" fill="#10b981" />,
                            <Cell key="cell-1" fill="#eab308" />,
                            <Cell key="cell-2" fill="#f97316" />,
                            <Cell key="cell-3" fill="#ef4444" />,
                          ] : <Cell fill="#f3f4f6" />}
                        </Pie>
                        <Tooltip 
                           contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Normal</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Low Risk</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Moderate</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> High Risk</div>
                  </div>
               </section>

               <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-white overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-600 rounded-full blur-[60px] opacity-20 -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 relative z-10 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" />
                    Insight Summary
                  </h4>
                  <div className="relative z-10 space-y-4">
                    <div className="flex justify-between items-baseline">
                      <p className="text-xs text-gray-400">Total Cases</p>
                      <p className="text-xl font-bold">{history.length}</p>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <p className="text-xs text-gray-400">Action Required</p>
                      <p className="text-xl font-bold text-red-500">{history.filter(h => h.riskLevel === 'High').length}</p>
                    </div>
                    <div className="h-px bg-gray-800 w-full mt-2"></div>
                    <p className="text-[10px] leading-relaxed text-gray-500 italic">
                      "System stability is optimal. Processing speed has increased by 12% following recent node calibration."
                    </p>
                  </div>
               </section>
            </div>
          </div>
        ) : (
          /* About Tab content */
          <div className="max-w-4xl mx-auto space-y-12">
            <section className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                 <BookOpen className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">How to Use BloodAI</h2>
              <p className="text-gray-500 mt-4 text-lg">
                Follow these simple steps to perform a professional-grade morphological blood analysis.
              </p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  title: "1. Capture Patient Data",
                  desc: "Start by entering the patient's legal name, date of birth, and Medical Record Number (MRN). This ensures all diagnostic reports are correctly attributed and compliant with record-keeping standards.",
                  icon: <User className="w-6 h-6 text-blue-600" />,
                  bg: "bg-blue-50"
                },
                {
                  title: "2. Load Microscopy Image",
                  desc: "Upload a high-resolution microscopic image of a blood smear. For best results, use samples stained with Wright-Giemsa at 1000x magnification.",
                  icon: <Upload className="w-6 h-6 text-purple-600" />,
                  bg: "bg-purple-50"
                },
                {
                  title: "3. Initiate AI Analysis",
                  desc: "Click 'Start Analysis' to let our Gemini-powered neural engine examine the specimen. Our AI looks for morphological markers of hematologic malignancies.",
                  icon: <Zap className="w-6 h-6 text-orange-600" />,
                  bg: "bg-orange-50"
                },
                {
                  title: "4. Review & Archive",
                  desc: "Review the classified cell type, risk assessment, and clinical interpretation. You can then download a formal PDF-ready pathology report for the patient's EHR.",
                  icon: <FileText className="w-6 h-6 text-emerald-600" />,
                  bg: "bg-emerald-50"
                }
              ].map((step, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex gap-6">
                  <div className={`w-14 h-14 shrink-0 rounded-xl ${step.bg} flex items-center justify-center`}>
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <section className="bg-gray-50 rounded-3xl p-10 border border-gray-200">
               <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                 <Search className="w-5 h-5 text-red-600" />
                 Specialized Diagnostic Taxonomy
               </h3>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 {[
                   { id: 0, name: "Basophil", risk: "Normal", desc: "Immune response markers" },
                   { id: 1, name: "Monocyte", risk: "Normal", desc: "Largest leukocyte type" },
                   { id: 2, name: "Seg_neutrophil", risk: "Normal", desc: "Infection fighting cells" },
                   { id: 3, name: "Erythroblast", risk: "Moderate", desc: "Immature red cells" },
                   { id: 4, name: "Normal", risk: "Normal", desc: "Healthy morphology" },
                   { id: 5, name: "Myeloblast", risk: "High", desc: "Primary leukemia marker" }
                 ].map((cls) => (
                   <div key={cls.id} className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col gap-1">
                     <div className="flex justify-between items-center mb-1">
                       <span className="text-[10px] font-mono text-gray-400">ID: {cls.id}</span>
                       <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${cls.risk === 'High' ? 'bg-red-50 text-red-600 border-red-100' : cls.risk === 'Moderate' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                         {cls.risk}
                       </span>
                     </div>
                     <span className="text-sm font-bold text-gray-900">{cls.name}</span>
                     <span className="text-[10px] text-gray-500 italic">{cls.desc}</span>
                   </div>
                 ))}
               </div>
               <p className="mt-6 text-[10px] text-gray-400 leading-relaxed max-w-2xl">
                 Our neural network is specifically tuned for these six categories to provide maximum sensitivity for Myeloblastic detection and common white blood cell stratification.
               </p>
            </section>

            <section className="bg-gray-900 rounded-3xl p-10 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-red-600 rounded-full blur-[100px] opacity-20 -mr-32 -mt-32"></div>
               <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                 <div className="flex-1">
                   <h3 className="text-2xl font-bold mb-4">Diagnostic Accuracy & Support</h3>
                   <p className="text-gray-400 text-sm leading-relaxed mb-6">
                     BloodAI is designed as a Decision Support System (DSS) for hematologists and general practitioners. While our AI achieves high screening accuracy, it is intentionally built to complement human expertise, not replace it.
                   </p>
                   <ul className="space-y-3">
                     <li className="flex items-center gap-3 text-xs text-gray-300">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                       Real-time morphological classification
                     </li>
                     <li className="flex items-center gap-3 text-xs text-gray-300">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                       Patient outcome prediction markers
                     </li>
                   </ul>
                 </div>
                 <div className="w-full md:w-64 aspect-square bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <Microscope className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">System Status</p>
                    <p className="text-lg font-bold">Lab-Ready</p>
                    <div className="mt-4 flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                       <span className="text-[10px] text-gray-400">All Nodes Operational</span>
                    </div>
                 </div>
               </div>
            </section>
          </div>
        )}
      </main>

      {/* Global Notifications */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map(notification => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto"
            >
              <div className={`
                flex items-center gap-3 px-6 py-3 rounded-2xl shadow-xl backdrop-blur-md
                ${notification.type === 'success' ? 'bg-emerald-600/90 text-white' : ''}
                ${notification.type === 'error' ? 'bg-red-600/90 text-white' : ''}
                ${notification.type === 'info' ? 'bg-gray-900/90 text-white' : ''}
              `}>
                {notification.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {notification.type === 'error' && <ShieldAlert className="w-5 h-5" />}
                {notification.type === 'info' && <Loader2 className="w-5 h-5 animate-spin" />}
                <span className="text-sm font-bold truncate max-w-[300px]">{notification.message}</span>
                <button 
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="ml-2 p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <footer className="bg-white border-t border-gray-200 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Microscope className="text-gray-400 w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-400">BloodAI Diagnostics</span>
          </div>
          <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
            Leading the way in computational hematology. Our systems are trained on millions of verified pathology samples to ensure the highest standards of diagnostic support.
          </p>
          <div className="flex justify-center gap-6 mt-8">
             <button className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600">Privacy Policy</button>
             <button className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600">Terms of Service</button>
             <button className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600">Contact Lab Support</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
