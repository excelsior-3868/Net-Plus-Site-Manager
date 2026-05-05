import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Database, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface BulkImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: any[];
  importing: boolean;
  summary: {
    total: number;
    valid: number;
    duplicates: number;
    invalid: number;
  };
}

export default function BulkImportPreviewModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  data, 
  importing,
  summary
}: BulkImportPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-ntc-blue/20 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-8 py-6 bg-gray-50/50">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Database size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ntc-blue">Bulk Import Preview</h2>
                <p className="text-sm text-ntc-blue/60">Review and validate asset records before committing to database</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 p-8 bg-white border-b border-gray-100">
            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Total Records</p>
              <p className="text-2xl font-black text-indigo-900">{summary.total}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Ready to Import</p>
              <p className="text-2xl font-black text-emerald-900">{summary.valid}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Duplicates Skipped</p>
              <p className="text-2xl font-black text-amber-900">{summary.duplicates}</p>
            </div>
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Invalid Records</p>
              <p className="text-2xl font-black text-red-900">{summary.invalid}</p>
            </div>
          </div>

          {/* Table Preview */}
          <div className="flex-1 overflow-auto p-8 pt-4">
            <div className="rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-100">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-100">Node ID</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-100">Site Name</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-100">District/Province</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-100">Technologies</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-100">Transmission</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-100">Power</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.map((item, idx) => (
                    <tr key={idx} className={cn(
                      "hover:bg-gray-50/50 transition-colors",
                      item._isDuplicate || item._isInvalid ? "bg-gray-50/30 opacity-70" : ""
                    )}>
                      <td className="px-6 py-4">
                        {item._isInvalid ? (
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertCircle size={14} />
                            <span className="text-[10px] font-bold">Invalid</span>
                          </div>
                        ) : item._isDuplicate ? (
                          <div className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle size={14} />
                            <span className="text-[10px] font-bold">Duplicate</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle2 size={14} />
                            <span className="text-[10px] font-bold">Valid</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-ntc-blue">{item.siteId || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-600 font-medium">{item.name || 'Unnamed'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-gray-700">{item.admin?.district || 'N/A'}</span>
                          <span className="text-[9px] text-gray-400 uppercase tracking-tighter">{item.admin?.province || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(item.technologies?.type) && item.technologies.type.length > 0 ? (
                            item.technologies.type.map((t: string) => (
                              <span key={t} className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100/50">
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-[8px] text-gray-300 italic">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-purple-700">{item.transmission?.type || 'N/A'}</span>
                          <span className="text-[9px] text-gray-400">{item.transmission?.indoorTransEquipmentname || ''}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(item.power?.source) ? (
                            item.power.source.map((s: string) => (
                              <span key={s} className="text-[8px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-[8px] text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 px-8 py-6 bg-gray-50/50">
            <button
              onClick={onClose}
              disabled={importing}
              className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel Import
            </button>
            <div className="flex items-center gap-4">
              <div className="text-right mr-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Action Summary</p>
                <p className="text-sm font-black text-ntc-blue">Importing {summary.valid} New Records</p>
              </div>
              <button
                onClick={onConfirm}
                disabled={importing || summary.valid === 0}
                className={cn(
                  "flex items-center gap-2 rounded-2xl px-8 py-3 text-sm font-bold text-white shadow-xl transition-all active:scale-95",
                  importing || summary.valid === 0 
                    ? "bg-gray-300 cursor-not-allowed shadow-none" 
                    : "bg-ntc-blue hover:bg-ntc-blue-dark shadow-ntc-blue/20"
                )}
              >
                {importing ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Database size={18} />
                    </motion.div>
                    Processing...
                  </>
                ) : (
                  <>
                    <span>Commit to Database</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
