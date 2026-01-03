"use client";

import React from 'react';
import { Lock, CheckCircle, Trash2, Smartphone, QrCode } from "lucide-react";

export default function SecurityMFA({ mfaFactors, startEnrollment, removeFactor }: any) {
    return (
        <div className="max-w-2xl mx-auto p-8 animate-in fade-in duration-500">
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Lock className="h-5 w-5 text-emerald-600" /> Two-Factor Authentication (2FA)
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Protect your admin account with a second layer of security.</p>
                </div>
                <div className="p-8">
                    {mfaFactors.length > 0 ? (
                        <div className="space-y-6">
                            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-4">
                                <div className="p-3 bg-white rounded-full text-emerald-600 shadow-sm">
                                    <CheckCircle className="h-8 w-8" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-emerald-800 text-lg">MFA is Active</h4>
                                    <p className="text-sm text-emerald-700 mt-1">
                                        Your account is secured with an Authenticator App (TOTP).
                                    </p>
                                </div>
                            </div>
                            <div className="border-t border-slate-100 pt-6">
                                <button onClick={() => removeFactor(mfaFactors[0].id)} className="text-red-600 hover:text-red-700 text-sm font-bold flex items-center gap-2">
                                    <Trash2 className="h-4 w-4" /> Disable 2FA (Not Recommended)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                                <Smartphone className="h-10 w-10" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 mb-2">Secure Your Account</h4>
                            <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto">
                                Scan a QR code with Google Authenticator or Authy to enable 2FA.
                            </p>
                            <button onClick={startEnrollment} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 shadow-lg flex items-center gap-2 mx-auto transition-all active:scale-95">
                                <QrCode className="h-5 w-5" /> Setup Authenticator App
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}