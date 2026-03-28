import React, { useState, useMemo, useEffect } from "react";
import { initializeApp, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, createUserWithEmailAndPassword, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAnXDDMxEJjmDIDLPwO28MF9m1vTdK8Yn0",
  authDomain: "agenda-consultores-82678.firebaseapp.com",
  projectId: "agenda-consultores-82678",
  storageBucket: "agenda-consultores-82678.firebasestorage.app",
  messagingSenderId: "1093038644715",
  appId: "1:1093038644715:web:aa064decaa92713678cdae"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const storage = getStorage(firebaseApp);

// ─── EMAIL CONFIG DEFAULT (substituído pelas configurações salvas no Firestore) ──
const EMAIL_CONFIG_DEFAULT = {
  enabled:    false,
  publicKey:  "",
  serviceId:  "",
  templateId: "",
};

// App secundário para criar usuários sem deslogar o admin
function getSecondaryAuth() {
  try { initializeApp(firebaseConfig, "admin-ops"); } catch(e) {}
  return getAuth(getApp("admin-ops"));
}

// Helpers para salvar/carregar do Firestore
async function loadFromFirestore(key, fallback) {
  try {
    const snap = await getDoc(doc(db, "app_data", key));
    if (snap.exists()) return snap.data().value;
  } catch(e) { console.warn("Firestore load error:", e); }
  return fallback;
}
async function saveToFirestore(key, value) {
  try {
    await setDoc(doc(db, "app_data", key), { value });
  } catch(e) { console.warn("Firestore save error:", e); }
}

// Salvar entrada no histórico de alterações
async function saveHistorico(action, details) {
  try {
    await addDoc(collection(db, "historico"), {
      action,
      ...details,
      timestamp: new Date().toISOString()
    });
  } catch(e) { console.warn("Histórico save error:", e); }
}

// Buscar perfil do usuário no Firestore
async function getUserProfile(email) {
  try {
    const snap = await getDocs(collection(db, "usuarios"));
    for (const d of snap.docs) {
      if (d.data().email === email) return { id: d.id, ...d.data() };
    }
  } catch(e) { console.warn("Profile load error:", e); }
  return null;
}

const SCHEDULE_DATA = {"Antonio Matos":[{"month":"Setembro","day":1,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":8,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":10,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":15,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":16,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":18,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":19,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Setembro","day":22,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":24,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":29,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":1,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":20,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":27,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":3,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":5,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":10,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":12,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":17,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":19,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":24,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":26,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":1,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":8,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":10,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":15,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":22,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":23,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":26,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":29,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":30,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":2,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":5,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":7,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":12,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":14,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":19,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":21,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":26,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":28,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":2,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":11,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":18,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":25,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":25,"weekday":"Qua","client":"S","type":"holiday"},{"month":"Março","day":30,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":1,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":7,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":10,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":16,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":17,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":20,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":27,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Maio","day":1,"weekday":"Sex","client":"Feraido Dia do Trabalho","type":"client"},{"month":"Maio","day":4,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":6,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Maio","day":11,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":13,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"DEZEMBRO","day":25,"weekday":"Sex","client":"Natal","type":"holiday"}],"Augusto Meirelles":[{"month":"Setembro","day":1,"weekday":"Seg","client":"TSM","type":"client"},{"month":"Setembro","day":2,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":4,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":5,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":8,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":9,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":10,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":11,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":12,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":15,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":16,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":18,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":19,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":22,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":23,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":24,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":25,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":26,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":29,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":30,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":1,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":2,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":3,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Outubro","day":6,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":7,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":10,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Outubro","day":13,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":16,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":17,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Outubro","day":20,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":21,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":23,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":24,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Outubro","day":27,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":28,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":30,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":31,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":3,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":4,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":5,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":6,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":7,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":10,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":11,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":12,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":13,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":14,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":17,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":18,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":19,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":20,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":21,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":24,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":25,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":26,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":27,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":28,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":1,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":2,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":4,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":5,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":8,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":9,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":10,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":11,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":12,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":15,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":16,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":18,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":19,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":22,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":23,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":26,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":29,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":30,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":2,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":5,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":6,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":7,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":8,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":9,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":12,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":13,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":14,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":15,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":16,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":19,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":20,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":21,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":22,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":23,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":26,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":27,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":28,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":29,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":30,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":2,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":3,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":6,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":9,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":10,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":11,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":12,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":13,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":18,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":19,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":20,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":23,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":24,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":25,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":27,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Março","day":2,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":3,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":5,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Março","day":6,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Março","day":9,"weekday":"Seg","client":"CABOVEL","type":"client"},{"month":"Março","day":10,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":11,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":12,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Março","day":13,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Março","day":16,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":17,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":18,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":19,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Março","day":20,"weekday":"Sex","client":"CABOVEL","type":"client"},{"month":"Março","day":23,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":24,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":25,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Março","day":26,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Março","day":27,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Março","day":30,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":31,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":1,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":7,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":10,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":15,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":16,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":17,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":20,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":21,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":23,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":24,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Abril","day":27,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":28,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":30,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":1,"weekday":"Sex","client":"Feraido Dia do Trabalho","type":"client"},{"month":"Maio","day":4,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":5,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Maio","day":6,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":7,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":8,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Maio","day":11,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":12,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Maio","day":13,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":14,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":15,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Maio","day":18,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":19,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":20,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":21,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":22,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Maio","day":25,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":26,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":27,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":28,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":29,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":1,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":2,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":4,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":5,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":8,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":9,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":10,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":11,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":12,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":15,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":16,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":18,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":19,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":22,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":23,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":24,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":25,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":26,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":29,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":30,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":1,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"JULHO","day":2,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":3,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":6,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":7,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":8,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":9,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":10,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":13,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":14,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"JULHO","day":16,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":17,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":20,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":21,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":22,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":23,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":24,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":27,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":28,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"JULHO","day":30,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":31,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":3,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":4,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":5,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":6,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":7,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":10,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":11,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":12,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"AGOSTO","day":13,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":14,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":17,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":18,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":19,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":20,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":21,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":24,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":25,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":26,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"AGOSTO","day":27,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":28,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":31,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":1,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":2,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":3,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":4,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":7,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":8,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":9,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"SETEMBRO","day":10,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":11,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":14,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":15,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":16,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":17,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":18,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":21,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":22,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":23,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"SETEMBRO","day":24,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":25,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":28,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":29,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":30,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":1,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":2,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":5,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":6,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":7,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"OUTUBRO","day":8,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":9,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":12,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":13,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":14,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":15,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":16,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":19,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":20,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":21,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"OUTUBRO","day":22,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":23,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":26,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":27,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":28,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":29,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":30,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":2,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":3,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"NOVEMBRO","day":5,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":6,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":9,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":10,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":11,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":12,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":13,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":16,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":17,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":18,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":19,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":20,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":23,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":24,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":25,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"NOVEMBRO","day":26,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":27,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":30,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":1,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":2,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"DEZEMBRO","day":3,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":4,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":7,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":8,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":9,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":10,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":11,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":14,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":15,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":16,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":17,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":21,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":22,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":23,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":24,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":25,"weekday":"Sex","client":"Natal","type":"holiday"},{"month":"DEZEMBRO","day":28,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":29,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":30,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"DEZEMBRO","day":31,"weekday":"Qui","client":"TIROLEZ","type":"client"}],"Celso Tarabori":[{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Abril","day":2,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":23,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":1,"weekday":"Sex","client":"Feraido Dia do Trabalho","type":"client"},{"month":"Maio","day":7,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":8,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"DEZEMBRO","day":25,"weekday":"Sex","client":"Natal","type":"holiday"}],"Dalcione Carpenedo":[{"month":"Setembro","day":1,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":2,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":3,"weekday":"Qua","client":"TSJC","type":"client"},{"month":"Setembro","day":4,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":5,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Setembro","day":8,"weekday":"Seg","client":"TSJC","type":"client"},{"month":"Setembro","day":9,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":10,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":11,"weekday":"Qui","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":12,"weekday":"Sex","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":15,"weekday":"Seg","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":16,"weekday":"Ter","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":17,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":18,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Setembro","day":19,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Setembro","day":22,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":23,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":24,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":25,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Setembro","day":26,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Setembro","day":29,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":30,"weekday":"Ter","client":"TSJC","type":"client"},{"month":"Outubro","day":1,"weekday":"Qua","client":"TSJC","type":"client"},{"month":"Outubro","day":2,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Outubro","day":3,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Outubro","day":6,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":7,"weekday":"Ter","client":"TSJC","type":"client"},{"month":"Outubro","day":8,"weekday":"Qua","client":"TSJC","type":"client"},{"month":"Outubro","day":9,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Outubro","day":10,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Outubro","day":13,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":14,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":15,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":16,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Outubro","day":17,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Outubro","day":20,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":21,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":22,"weekday":"Qua","client":"TSJC","type":"client"},{"month":"Outubro","day":23,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Outubro","day":24,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Outubro","day":27,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":28,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":29,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":30,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Outubro","day":31,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Novembro","day":3,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":4,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":5,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":6,"weekday":"Qua","client":"TSJC","type":"client"},{"month":"Novembro","day":7,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Novembro","day":10,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":11,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":12,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":13,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":14,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Novembro","day":17,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":18,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":19,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":20,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":21,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Novembro","day":24,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":25,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":26,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":27,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Novembro","day":28,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Dezembro","day":1,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":2,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":3,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":4,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Dezembro","day":5,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Dezembro","day":8,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":9,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":10,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":11,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Dezembro","day":12,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Dezembro","day":15,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":16,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":17,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":18,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Dezembro","day":19,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Dezembro","day":22,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":23,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":26,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Dezembro","day":29,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":30,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":2,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Janeiro","day":5,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":6,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":7,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":8,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Janeiro","day":9,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Janeiro","day":12,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":13,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":14,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":15,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Janeiro","day":16,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Janeiro","day":19,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":20,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":21,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":22,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Janeiro","day":23,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Janeiro","day":26,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":27,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":28,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":29,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Janeiro","day":30,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Fevereiro","day":2,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":3,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":4,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Fevereiro","day":6,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Fevereiro","day":9,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":10,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":11,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":12,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Fevereiro","day":13,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Fevereiro","day":16,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":18,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":19,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Fevereiro","day":20,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Fevereiro","day":23,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":24,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":25,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Fevereiro","day":27,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Março","day":2,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":3,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":4,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Março","day":5,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Março","day":6,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Março","day":9,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":10,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":11,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Março","day":12,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Março","day":13,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Março","day":16,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":17,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":18,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Março","day":19,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Março","day":20,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Março","day":23,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":24,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":25,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Março","day":26,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Março","day":27,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Março","day":30,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":31,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Abril","day":1,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":6,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Abril","day":7,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Abril","day":8,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":9,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Abril","day":10,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Abril","day":13,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Abril","day":14,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Abril","day":15,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":16,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Abril","day":17,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Abril","day":20,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Abril","day":21,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Abril","day":22,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":23,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Abril","day":24,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Abril","day":27,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Abril","day":28,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Abril","day":29,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":30,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Maio","day":1,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Maio","day":4,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Maio","day":5,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":6,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":7,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Maio","day":8,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Maio","day":11,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Maio","day":12,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":13,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":14,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Maio","day":15,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Maio","day":18,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Maio","day":19,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":20,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":21,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Maio","day":22,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Maio","day":25,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Maio","day":26,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":27,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":28,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Maio","day":29,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JUNHO","day":1,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":2,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":3,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":4,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JUNHO","day":5,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JUNHO","day":8,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":9,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":10,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":11,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JUNHO","day":12,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JUNHO","day":15,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":16,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":17,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":18,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JUNHO","day":19,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JUNHO","day":22,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":23,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":24,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":25,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JUNHO","day":26,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JUNHO","day":29,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":30,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":1,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":2,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JULHO","day":3,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JULHO","day":6,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":7,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":8,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":9,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JULHO","day":10,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JULHO","day":13,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":14,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":15,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":16,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JULHO","day":17,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JULHO","day":20,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":21,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":22,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":23,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JULHO","day":24,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JULHO","day":27,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":28,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":29,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":30,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JULHO","day":31,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"AGOSTO","day":3,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":4,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":5,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":6,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"AGOSTO","day":7,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"AGOSTO","day":10,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":11,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":12,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":13,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"AGOSTO","day":14,"weekday":"Sex","client":"TSUL","type":"client"}],"Dirce Matos":[{"month":"Setembro","day":2,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":4,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":9,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":10,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":11,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":15,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":16,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":18,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":19,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Setembro","day":22,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":23,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":24,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":25,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":26,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Setembro","day":30,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":1,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":2,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":7,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":16,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":21,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":23,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":27,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":28,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":4,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":5,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":6,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":11,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":12,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":13,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":18,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":19,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":20,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":24,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":25,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":26,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":2,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":4,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":9,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":10,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":11,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":16,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":18,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":22,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":23,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":26,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":29,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":30,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":2,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":5,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":6,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":7,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":8,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":9,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":12,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":13,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":14,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":15,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":16,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":20,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":21,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":22,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":27,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":28,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":29,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":3,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":10,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":12,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":18,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":19,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":24,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Março","day":3,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Março","day":5,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Março","day":11,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":18,"weekday":"Qua","client":"UNIMOL","type":"client"},{"month":"Março","day":19,"weekday":"Qui","client":"UNIMOL","type":"client"},{"month":"Março","day":24,"weekday":"Ter","client":"UNIMOL","type":"client"},{"month":"Março","day":25,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":26,"weekday":"Qui","client":"UNIMOL","type":"client"},{"month":"Março","day":31,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":1,"weekday":"Qua","client":"UNIMOL","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":7,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":10,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":16,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":17,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":20,"weekday":"Seg","client":"UNIMOL","type":"client"},{"month":"Abril","day":21,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":22,"weekday":"Qua","client":"UNIMOL","type":"client"},{"month":"Abril","day":23,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":28,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":30,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":1,"weekday":"Sex","client":"Feraido Dia do Trabalho","type":"client"},{"month":"Maio","day":5,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Maio","day":7,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":13,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Maio","day":20,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Maio","day":27,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"DEZEMBRO","day":25,"weekday":"Sex","client":"Natal","type":"holiday"}],"Hilton Vinhola":[{"month":"Setembro","day":1,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":2,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":3,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":4,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":9,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":10,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":11,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":12,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":15,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":16,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":17,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":18,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":22,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":23,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":24,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":25,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":29,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":30,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":1,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":2,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":6,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":7,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":8,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":9,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":13,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":14,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":15,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":16,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":20,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":21,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":22,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":23,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":27,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":28,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":29,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":30,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":3,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":4,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":5,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":6,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":10,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":11,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":12,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":13,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":17,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":18,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":19,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":20,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":24,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":25,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":26,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":27,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":1,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":2,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":3,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":4,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":8,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":9,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":10,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":11,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":15,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":16,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":17,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":18,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":22,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":23,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":26,"weekday":"Sex","client":"FÉRIAS","type":"vacation"},{"month":"Dezembro","day":29,"weekday":"Seg","client":"FÉRIAS","type":"vacation"},{"month":"Dezembro","day":30,"weekday":"Ter","client":"FÉRIAS","type":"vacation"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":2,"weekday":"Sex","client":"FÉRIAS","type":"vacation"},{"month":"Janeiro","day":5,"weekday":"Seg","client":"FÉRIAS","type":"vacation"},{"month":"Janeiro","day":6,"weekday":"Ter","client":"FÉRIAS","type":"vacation"},{"month":"Janeiro","day":7,"weekday":"Qua","client":"FÉRIAS","type":"vacation"},{"month":"Janeiro","day":8,"weekday":"Qui","client":"FÉRIAS","type":"vacation"},{"month":"Janeiro","day":9,"weekday":"Sex","client":"FÉRIAS","type":"vacation"},{"month":"Janeiro","day":12,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":13,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":14,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":15,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":19,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":20,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":21,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":22,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":26,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":27,"weekday":"Ter","client":"TSM","type":"client"},{"month":"Janeiro","day":28,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":29,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":2,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":3,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":9,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":10,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":11,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":12,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":13,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":18,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":19,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":20,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":23,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":24,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":25,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Março","day":2,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":3,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":4,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Março","day":5,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Março","day":6,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":9,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":10,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":11,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Março","day":12,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Março","day":16,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":17,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Março","day":18,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Março","day":19,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Março","day":23,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":24,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":25,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Março","day":26,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Março","day":30,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":31,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Abril","day":1,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":7,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":8,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":9,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Abril","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":15,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":16,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Abril","day":20,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Abril","day":21,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Abril","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":23,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":27,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Abril","day":28,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Abril","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":30,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":1,"weekday":"Sex","client":"Feraido Dia do Trabalho","type":"client"},{"month":"Maio","day":4,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Maio","day":5,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":6,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Maio","day":7,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":11,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Maio","day":12,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":13,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Maio","day":14,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":18,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Maio","day":19,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":20,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":21,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Maio","day":25,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Maio","day":26,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":27,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":28,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":1,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":2,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":3,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":4,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":8,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":9,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":10,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":11,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":15,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":16,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":17,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":18,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":22,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":23,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":24,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":25,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":29,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":30,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":1,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":2,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":6,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":7,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":8,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":9,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":13,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":14,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":15,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":16,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":20,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":21,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":22,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":23,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":27,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":28,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":29,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":30,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":3,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":4,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":5,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":6,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":10,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":11,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":12,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":13,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":17,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":18,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":19,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":20,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":24,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":25,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":26,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":27,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":31,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":1,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":2,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":3,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":7,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":8,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":9,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":10,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":14,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":15,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":16,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":17,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":21,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":22,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":23,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":24,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":28,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":29,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":30,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":1,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":5,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":6,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":7,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":8,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":12,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":13,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":14,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":15,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":19,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":20,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":21,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":22,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":26,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":27,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":28,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":29,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":2,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":3,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":4,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":5,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":9,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":10,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":11,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":12,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":16,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":17,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":18,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":19,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":23,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":24,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":25,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":26,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":30,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":1,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":2,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":3,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":7,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":8,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":9,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":10,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":14,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":15,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":16,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":17,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":21,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":22,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":23,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":24,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":25,"weekday":"Sex","client":"Natal","type":"holiday"},{"month":"DEZEMBRO","day":28,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":29,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":30,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":31,"weekday":"Qui","client":"TIROLEZ","type":"client"}],"Lucas Cintra":[{"month":"Setembro","day":1,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":2,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":4,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":5,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Setembro","day":8,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":9,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":10,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":11,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":12,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Setembro","day":15,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":16,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":18,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":19,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Setembro","day":22,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":23,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":24,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":25,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":26,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Setembro","day":29,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":30,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":1,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":2,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":3,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Outubro","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":7,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":10,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Outubro","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":16,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":17,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Outubro","day":20,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":21,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":23,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":24,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Outubro","day":27,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":28,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":30,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":31,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Novembro","day":3,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":4,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":5,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":6,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":7,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Novembro","day":10,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":11,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":12,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":13,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":14,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Novembro","day":17,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":18,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":19,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":20,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":21,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Novembro","day":24,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":25,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":26,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":27,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":28,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":1,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":2,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":4,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":5,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":8,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":9,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":10,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":11,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":12,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":15,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":16,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":18,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":19,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":22,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":23,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":26,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":29,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":30,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":2,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":5,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":6,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":7,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":8,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":9,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":12,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":13,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":14,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":15,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":16,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":19,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":20,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":21,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":22,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":23,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":26,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":27,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":28,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":29,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":30,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":2,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":3,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":6,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":9,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":10,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":11,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":12,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":13,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":18,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":19,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":20,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":23,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":24,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":25,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":27,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":2,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":6,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":10,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Março","day":12,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Março","day":17,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Março","day":19,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Março","day":24,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Março","day":26,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Março","day":30,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":31,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":1,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":7,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":10,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":16,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":17,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":20,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":21,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":23,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":24,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":27,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":28,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":30,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":1,"weekday":"Sex","client":"Feraido Dia do Trabalho","type":"client"},{"month":"Maio","day":4,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":5,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Maio","day":6,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Maio","day":7,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":8,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Maio","day":11,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":12,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Maio","day":13,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Maio","day":14,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":15,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Maio","day":19,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Maio","day":21,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":26,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Maio","day":28,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":2,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":9,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":16,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":23,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"DEZEMBRO","day":25,"weekday":"Sex","client":"Natal","type":"holiday"}],"Rodrigo Rodrigues":[{"month":"Setembro","day":1,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":3,"weekday":"Qua","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":4,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":5,"weekday":"Sex","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":8,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":9,"weekday":"Ter","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":10,"weekday":"Qua","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":11,"weekday":"Qui","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":12,"weekday":"Sex","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":15,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":16,"weekday":"Ter","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":17,"weekday":"Qua","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":18,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":19,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":22,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":23,"weekday":"Ter","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":24,"weekday":"Qua","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":25,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":26,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":29,"weekday":"Seg","client":"RESERVADO","type":"reserved"},{"month":"Setembro","day":30,"weekday":"Ter","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":1,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":2,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":3,"weekday":"Sex","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":6,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":7,"weekday":"Ter","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":8,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":9,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":10,"weekday":"Sex","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":13,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":14,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":15,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":16,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":17,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":20,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":21,"weekday":"Ter","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":22,"weekday":"Qua","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":23,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":24,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":30,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":31,"weekday":"Sex","client":"RESERVADO","type":"reserved"},{"month":"Novembro","day":3,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"}],"Fabi RH":[{"month":"Setembro","day":29,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":30,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":1,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":2,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":3,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":6,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":7,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":8,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":9,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":10,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":13,"weekday":"Seg","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":14,"weekday":"Ter","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":15,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":16,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":17,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":20,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":21,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":22,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":23,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":24,"weekday":"Sex","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":27,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":28,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":29,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":30,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":31,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":3,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":4,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":6,"weekday":"Qua","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":7,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":10,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":11,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":13,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":14,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":17,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":18,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":20,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":21,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":24,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":25,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":27,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":28,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"}],"Marcelo Franco":[{"month":"Novembro","day":6,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":7,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Novembro","day":10,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":11,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":12,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":13,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":14,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Novembro","day":17,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":18,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":19,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":20,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":21,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Novembro","day":27,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":28,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":4,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":5,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":11,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":12,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":18,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":19,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":26,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":2,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":8,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":9,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":15,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":16,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":22,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":23,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":29,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":30,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":6,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":12,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":13,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":19,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":20,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":27,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":2,"weekday":"Seg","client":"UNIMOL","type":"client"},{"month":"Março","day":3,"weekday":"Ter","client":"UNIMOL","type":"client"},{"month":"Março","day":6,"weekday":"Sex","client":"UNIMOL","type":"client"},{"month":"Março","day":9,"weekday":"Seg","client":"UNIMOL","type":"client"},{"month":"Março","day":10,"weekday":"Ter","client":"UNIMOL","type":"client"},{"month":"Março","day":11,"weekday":"Qua","client":"UNIMOL","type":"client"},{"month":"Março","day":16,"weekday":"Seg","client":"UNIMOL","type":"client"},{"month":"Março","day":17,"weekday":"Ter","client":"UNIMOL","type":"client"},{"month":"Março","day":23,"weekday":"Seg","client":"UNIMOL","type":"client"},{"month":"Março","day":24,"weekday":"Ter","client":"UNIMOL","type":"client"},{"month":"Março","day":30,"weekday":"Seg","client":"UNIMOL","type":"client"},{"month":"Março","day":31,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":7,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":10,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":16,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":17,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":20,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":24,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":30,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":1,"weekday":"Sex","client":"Feraido Dia do Trabalho","type":"client"},{"month":"Maio","day":7,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":8,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Maio","day":14,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":15,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"DEZEMBRO","day":25,"weekday":"Sex","client":"Natal","type":"holiday"}],"Luciano Trigilio":[{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Fevereiro","day":2,"weekday":"Seg","client":"TEJOFRAN","type":"client"},{"month":"Fevereiro","day":3,"weekday":"Ter","client":"TEJOFRAN","type":"client"},{"month":"Fevereiro","day":4,"weekday":"Qua","client":"TEJOFRAN","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Fevereiro","day":6,"weekday":"Sex","client":"TEJOFRAN","type":"client"},{"month":"Fevereiro","day":9,"weekday":"Seg","client":"TEJOFRAN","type":"client"},{"month":"Fevereiro","day":10,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Fevereiro","day":11,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Fevereiro","day":12,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Fevereiro","day":13,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":16,"weekday":"Seg","client":"GHT4","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":18,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Fevereiro","day":19,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Fevereiro","day":20,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":23,"weekday":"Seg","client":"GHT4","type":"client"},{"month":"Fevereiro","day":24,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Fevereiro","day":25,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Fevereiro","day":27,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":2,"weekday":"Seg","client":"GHT4","type":"client"},{"month":"Março","day":3,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Março","day":4,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Março","day":5,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Março","day":6,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Março","day":9,"weekday":"Seg","client":"GHT4","type":"client"},{"month":"Março","day":10,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Março","day":11,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":12,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Março","day":13,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":16,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":17,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Março","day":18,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":19,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Março","day":20,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":23,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":24,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Março","day":25,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Março","day":26,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Março","day":27,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":30,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":31,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Abril","day":1,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":7,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Abril","day":8,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Abril","day":9,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Abril","day":10,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":14,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Abril","day":15,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Abril","day":16,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Abril","day":17,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":20,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":21,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Abril","day":22,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Abril","day":23,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Abril","day":24,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":27,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":28,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Abril","day":29,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Abril","day":30,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Maio","day":1,"weekday":"Sex","client":"Feraido Dia do Trabalho","type":"client"},{"month":"Maio","day":4,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":5,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Maio","day":6,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Maio","day":7,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Maio","day":8,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Maio","day":11,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":12,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Maio","day":13,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Maio","day":14,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Maio","day":15,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Maio","day":18,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":19,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Maio","day":20,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Maio","day":21,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Maio","day":22,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Maio","day":25,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":26,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Maio","day":27,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Maio","day":28,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Maio","day":29,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":4,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"JUNHO","day":11,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"JUNHO","day":18,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"JUNHO","day":25,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"JULHO","day":2,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"JULHO","day":9,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"JULHO","day":16,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"JULHO","day":23,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"JULHO","day":30,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"AGOSTO","day":6,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"AGOSTO","day":13,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"AGOSTO","day":20,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"AGOSTO","day":27,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"SETEMBRO","day":3,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"SETEMBRO","day":10,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"SETEMBRO","day":17,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"SETEMBRO","day":24,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"OUTUBRO","day":1,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"OUTUBRO","day":8,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"OUTUBRO","day":15,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"OUTUBRO","day":22,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"OUTUBRO","day":29,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"NOVEMBRO","day":5,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"NOVEMBRO","day":12,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"NOVEMBRO","day":19,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"NOVEMBRO","day":26,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"DEZEMBRO","day":3,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"DEZEMBRO","day":10,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"DEZEMBRO","day":17,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"DEZEMBRO","day":24,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"DEZEMBRO","day":31,"weekday":"Qui","client":"RESERVADO","type":"reserved"}],"Heverson Gomes":[{"month":"Fevereiro","day":3,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Fevereiro","day":6,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Fevereiro","day":10,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Fevereiro","day":12,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Fevereiro","day":13,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":19,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Fevereiro","day":20,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Fevereiro","day":24,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Fevereiro","day":27,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Março","day":3,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Março","day":5,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Março","day":6,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Março","day":10,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Março","day":12,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Março","day":13,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Março","day":17,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Março","day":19,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Março","day":20,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Março","day":24,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Março","day":26,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Março","day":27,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Março","day":31,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"}],"Thiago Berna":[{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Fevereiro","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":9,"weekday":"Seg","client":"MAZZA / VEDACIT","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Março","day":6,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":9,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":13,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":16,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":20,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":23,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":26,"weekday":"Qui","client":"VEDACIT","type":"client"}],"Rodolfo Rosseto":[{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"}]};


const MONTHS_ORDER = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// ── Feriados nacionais do Brasil ──────────────────────────────────────────────
function calcularPascoa(ano) {
  // Algoritmo de Meeus/Jones/Butcher
  const a = ano % 19, b = Math.floor(ano/100), c = ano % 100;
  const d = Math.floor(b/4), e = b % 4, f = Math.floor((b+8)/25);
  const g = Math.floor((b-f+1)/3), h = (19*a+b-d-g+15) % 30;
  const i = Math.floor(c/4), k = c % 4;
  const l = (32+2*e+2*i-h-k) % 7;
  const m = Math.floor((a+11*h+22*l)/451);
  const mes = Math.floor((h+l-7*m+114)/31);
  const dia = ((h+l-7*m+114) % 31) + 1;
  return new Date(ano, mes-1, dia);
}

function getFeriadosBrasil(ano) {
  const pascoa = calcularPascoa(ano);
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate()+n); return r; };

  const feriados = [
    // Fixos
    { mes:1,  dia:1,  nome:"Confraternização Universal" },
    { mes:4,  dia:21, nome:"Tiradentes" },
    { mes:5,  dia:1,  nome:"Dia do Trabalho" },
    { mes:9,  dia:7,  nome:"Independência do Brasil" },
    { mes:10, dia:12, nome:"Nossa Sra. Aparecida" },
    { mes:11, dia:2,  nome:"Finados" },
    { mes:11, dia:15, nome:"Proclamação da República" },
    { mes:11, dia:20, nome:"Consciência Negra" },
    { mes:12, dia:25, nome:"Natal" },
    // Móveis calculados a partir da Páscoa
    { data: addDays(pascoa,-48), nome:"Carnaval (2ª)" },
    { data: addDays(pascoa,-47), nome:"Carnaval (3ª)" },
    { data: addDays(pascoa,-2),  nome:"Sexta-Feira Santa" },
    { data: pascoa,              nome:"Páscoa" },
    { data: addDays(pascoa,60),  nome:"Corpus Christi" },
  ];

  // Normalizar tudo para { mes, dia, nome }
  return feriados.map(f => {
    if (f.data) return { mes: f.data.getMonth()+1, dia: f.data.getDate(), nome: f.nome };
    return f;
  });
}

// Retorna nome do feriado ou null
function getFeriadoNacional(dia, mes, ano) {
  const lista = getFeriadosBrasil(ano);
  const f = lista.find(f => f.mes === mes && f.dia === dia);
  return f ? f.nome : null;
}
const INITIAL_CLIENTS = ["VEDACIT","TIROLEZ","MAZZAFERRO","TSJC","TSUL","GHT4","UNIMOL","TEJOFRAN","TSM","TOYOBO","PARTICULAR","CABOVEL","GOBEAUTE"];
const CLIENT_COLORS = { VEDACIT:"#3b82f6",TIROLEZ:"#f59e0b",MAZZAFERRO:"#8b5cf6",TSJC:"#10b981",TSUL:"#06b6d4",GHT4:"#f97316",UNIMOL:"#ec4899",TEJOFRAN:"#6366f1",TSM:"#84cc16",TOYOBO:"#a855f7",PARTICULAR:"#6e6e88",CABOVEL:"#14b8a6",GOBEAUTE:"#f43f5e",RESERVADO:"#6e6e88",default:"#6b7280" };

function getClientColor(client) {
  if (!client) return "#e5e7eb";
  const key = Object.keys(CLIENT_COLORS).find(k => client.toUpperCase().includes(k));
  return key ? CLIENT_COLORS[key] : CLIENT_COLORS.default;
}
function getInitials(name) { return name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase(); }
function formatDateTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }); }
  catch(e) { return iso; }
}

function normalizeClient(client) {
  if (!client) return "";
  return client.split("\n")[0].trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,10);
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function ensureIds(scheduleData) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-11
  const result = {};
  for (const [c, entries] of Object.entries(scheduleData||{})) {
    result[c] = (entries||[]).map(e => {
      let upd = e.id ? e : {...e, id: genId()};
      if (!upd.year) {
        let inferredYear = currentYear;
        if (upd.criadoEm) {
          try { inferredYear = new Date(upd.criadoEm).getFullYear(); } catch(_) {}
        } else {
          // Inferir pelo mês: Set-Dez sem criadoEm → provavelmente ano anterior
          const mIdx = MONTHS_ORDER.findIndex(m => m.toUpperCase() === (upd.month||"").toUpperCase());
          if (mIdx >= 0) {
            // Se o mês da entrada é posterior ao mês atual, é do ano anterior
            if (mIdx > currentMonth) {
              inferredYear = currentYear - 1;
            }
          }
        }
        upd = {...upd, year: inferredYear};
      }
      return upd;
    });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DE AGENDA (incluir/editar agendamentos)
// ─────────────────────────────────────────────────────────────────────────────
function AgendaModal({ consultores, clients, months, editEntry, onSave, onClose }) {
  const isPrefill = !!editEntry?.prefill; // clicked empty cell — new entry pre-filled with context
  const isEdit    = !!editEntry && !isPrefill; // editing an existing entry

  const [consultor, setConsultor] = useState(editEntry?.consultor || consultores[0] || "");
  const [month, setMonth] = useState(editEntry?.month || months[0] || "");
  const [year, setYear] = useState(editEntry?.year || new Date().getFullYear());
  const [client, setClient] = useState(editEntry?.client || "");
  const [type, setType] = useState(editEntry?.type || "client");
  const [modalidade, setModalidade] = useState(editEntry?.modalidade || "presencial");
  const [horaInicio, setHoraInicio] = useState(editEntry?.horaInicio || "08:00");
  const [horaFim, setHoraFim] = useState(editEntry?.horaFim || "17:00");
  const [intervalo, setIntervalo] = useState(editEntry?.intervalo || "");
  const [atividades, setAtividades] = useState(editEntry?.atividades || "");
  const [dayMode, setDayMode] = useState("range");
  const [dayFrom, setDayFrom] = useState(editEntry?.day || 1);
  const [dayTo, setDayTo] = useState(editEntry?.day || 1);
  const [selectedDays, setSelectedDays] = useState(editEntry?.day ? [editEntry.day] : []);
  const [error, setError] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);

  const toggleDay = (d) => setSelectedDays(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev,d].sort((a,b)=>a-b));

  const handleSave = () => {
    if (!consultor) { setError("Selecione um consultor."); return; }
    if (!client.trim() && type === "client") { setError("Informe o cliente."); return; }
    let days = [];
    if (isEdit) { days = [editEntry.day]; }
    else if (dayMode === "range") { for (let d=Number(dayFrom);d<=Number(dayTo);d++) days.push(d); }
    else { days = selectedDays; }
    if (days.length === 0) { setError("Selecione ao menos um dia."); return; }
    onSave({ id: editEntry?.id, consultor, month, year: Number(year), days, client: client.trim(), type, modalidade, horaInicio, horaFim, intervalo, atividades: atividades.trim(), notifyEmail });
  };

  const inp = { padding:"9px 13px", borderRadius:"10px", border:"1px solid #2a2a3a", background:"#0d0d14", color:"#c8c8d8", fontSize:"13px", width:"100%", boxSizing:"border-box", fontFamily:"inherit" };
  const lbl = { fontSize:"11px", color:"#3e3e55", fontWeight:700, marginBottom:"7px", display:"block", letterSpacing:"0.5px", textTransform:"uppercase" };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
      <div style={{ background:"#111118",borderRadius:"20px",padding:"30px",width:"100%",maxWidth:"520px",border:"1px solid #1f1f2e",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 32px 80px rgba(0,0,0,0.8)",animation:"fadeUp .25s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"24px" }}>
          <div>
            <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"18px",fontWeight:900,color:"#f0f0fa",margin:0,letterSpacing:"-0.3px" }}>{isEdit?"Editar Agenda":"Nova Agenda"}</h2>
            {isPrefill && <p style={{ margin:"4px 0 0",fontSize:"12px",color:"#3e3e55" }}>📅 {editEntry.consultor.split(" ")[0]} · {editEntry.month} · Dia {editEntry.day}</p>}
          </div>
          <button onClick={onClose} style={{ background:"#1f1f2e",border:"1px solid #2a2a3a",color:"#6e6e88",borderRadius:"10px",width:"32px",height:"32px",cursor:"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>✕</button>
        </div>
        {error && <div style={{ background:"#f04f5e15",border:"1px solid #f04f5e40",borderRadius:"10px",padding:"10px 14px",color:"#f87171",fontSize:"13px",marginBottom:"16px" }}>⚠️ {error}</div>}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 80px",gap:"16px",marginBottom:"16px" }}>
          <div><label style={lbl}>Consultor</label>
            <select value={consultor} onChange={e=>setConsultor(e.target.value)} style={{...inp, opacity:(isEdit||isPrefill)?0.6:1}} disabled={isEdit||isPrefill}>
              {consultores.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Mês</label>
            <select value={month} onChange={e=>setMonth(e.target.value)} style={{...inp, opacity:(isEdit||isPrefill)?0.6:1}} disabled={isEdit||isPrefill}>
              {months.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Ano</label>
            <select value={year} onChange={e=>setYear(e.target.value)} style={{...inp, opacity:(isEdit||isPrefill)?0.6:1}} disabled={isEdit||isPrefill}>
              {[new Date().getFullYear(), new Date().getFullYear()+1, new Date().getFullYear()+2].map(y=>(
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginBottom:"16px" }}>
          <label style={lbl}>Tipo de lançamento</label>
          <div style={{ display:"flex",gap:"5px",flexWrap:"wrap" }}>
            {[["client","👤 Cliente"],["vacation","🏖 Férias"],["absence","🤒 Afastamento"],["holiday","🎉 Feriado"],["reserved","🔒 Reservado"],["blocked","⛔ Bloqueado"]].map(([val,lab])=>(
              <button key={val} onClick={()=>setType(val)} style={{ padding:"6px 13px",borderRadius:"99px",border:"1px solid",cursor:"pointer",fontSize:"12px",fontWeight:600,transition:"all .15s",borderColor:type===val?"#6c63ff":"#2a2a3a",background:type===val?"#6c63ff22":"transparent",color:type===val?"#a78bfa":"#3e3e55" }}>{lab}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:"16px" }}>
          <label style={lbl}>Modalidade</label>
          <div style={{ display:"flex", gap:"8px" }}>
            {[["presencial","🏢 Presencial"],["remoto","💻 Remoto"]].map(([val,lab])=>(
              <button key={val} onClick={()=>setModalidade(val)} style={{ flex:1, padding:"10px 16px", borderRadius:"12px", border:"1px solid", cursor:"pointer", fontSize:"13px", fontWeight:600, transition:"all .15s",
                borderColor: modalidade===val ? (val==="presencial"?"#22d3a0":"#6c63ff") : "#2a2a3a",
                background: modalidade===val ? (val==="presencial"?"#22d3a015":"#6c63ff15") : "transparent",
                color: modalidade===val ? (val==="presencial"?"#22d3a0":"#a78bfa") : "#3e3e55"
              }}>{lab}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:"16px" }}>
          <label style={lbl}>Cliente / Descrição</label>
          <input list="clients-datalist" value={client} onChange={e=>setClient(e.target.value)}
            placeholder={type==="client"?"Selecione ou digite o cliente...":type==="vacation"?"Ex: FÉRIAS":type==="holiday"?"Nome do feriado":"Descrição..."} style={inp} autoFocus={isPrefill} />
          <datalist id="clients-datalist">{clients.map(c=><option key={c} value={c}/>)}</datalist>
        </div>
        {/* Horários */}
        <div style={{ marginBottom:"16px" }}>
          <label style={lbl}>⏰ Horário</label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px" }}>
            <div>
              <label style={{...lbl, fontSize:"11px"}}>Início</label>
              <input type="time" value={horaInicio} onChange={e=>setHoraInicio(e.target.value)} style={inp}/>
            </div>
            <div>
              <label style={{...lbl, fontSize:"11px"}}>Fim</label>
              <input type="time" value={horaFim} onChange={e=>setHoraFim(e.target.value)} style={inp}/>
            </div>
            <div>
              <label style={{...lbl, fontSize:"11px"}}>Intervalo (min)</label>
              <input type="number" min="0" max="240" step="15" value={intervalo} onChange={e=>setIntervalo(e.target.value)} placeholder="Ex: 60" style={inp}/>
            </div>
          </div>
          {horaInicio && horaFim && horaInicio < horaFim && (
            <div style={{ fontSize:"11px", color:"#6e6e88", marginTop:"6px" }}>
              {(() => {
                const [hi,mi] = horaInicio.split(":").map(Number);
                const [hf,mf] = horaFim.split(":").map(Number);
                const total = (hf*60+mf) - (hi*60+mi) - (Number(intervalo)||0);
                const h = Math.floor(total/60), m = total%60;
                return `⏱ ${h}h${m>0?m+"min":""} úteis${intervalo?" (após intervalo de "+intervalo+"min)":""}`;
              })()}
            </div>
          )}
        </div>
        {/* Atividades */}
        <div style={{ marginBottom:"16px" }}>
          <label style={lbl}>📝 Atividades / Observações</label>
          <textarea
            value={atividades}
            onChange={e=>setAtividades(e.target.value)}
            placeholder="Descreva as atividades previstas para este agendamento..."
            rows={3}
            style={{...inp, resize:"vertical", minHeight:"72px", fontFamily:"inherit", lineHeight:"1.5"}}
          />
        </div>
        {/* Day selection: hidden when editing or prefill (day already locked) */}
        {!isEdit && !isPrefill && (
          <div style={{ marginBottom:"20px" }}>
            <label style={lbl}>Seleção de dias</label>
            <div style={{ display:"flex",gap:"8px",marginBottom:"12px" }}>
              <button onClick={()=>setDayMode("range")} style={{ padding:"6px 14px",borderRadius:"20px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,background:dayMode==="range"?"#6366f1":"#2a2a3a",color:dayMode==="range"?"#fff":"#6e6e88" }}>📅 Período</button>
              <button onClick={()=>setDayMode("individual")} style={{ padding:"6px 14px",borderRadius:"20px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,background:dayMode==="individual"?"#6366f1":"#2a2a3a",color:dayMode==="individual"?"#fff":"#6e6e88" }}>🔢 Individuais</button>
            </div>
            {dayMode==="range" ? (
              <div style={{ display:"flex",gap:"12px",alignItems:"flex-end" }}>
                <div style={{ flex:1 }}><label style={{...lbl,fontSize:"11px"}}>Dia inicial</label><input type="number" min="1" max="31" value={dayFrom} onChange={e=>setDayFrom(e.target.value)} style={inp}/></div>
                <div style={{ color:"#6e6e88",paddingBottom:"10px",fontSize:"18px" }}>→</div>
                <div style={{ flex:1 }}><label style={{...lbl,fontSize:"11px"}}>Dia final</label><input type="number" min="1" max="31" value={dayTo} onChange={e=>setDayTo(e.target.value)} style={inp}/></div>
                {dayFrom && dayTo && Number(dayFrom)<=Number(dayTo) && <div style={{ paddingBottom:"10px",color:"#22d3a0",fontWeight:700,fontSize:"13px" }}>{Number(dayTo)-Number(dayFrom)+1}d</div>}
              </div>
            ) : (
              <div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"4px" }}>
                  {Array.from({length:31},(_,i)=>i+1).map(d=>(
                    <button key={d} onClick={()=>toggleDay(d)} style={{ padding:"6px 2px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:700,background:selectedDays.includes(d)?"#3b82f6":"#2a2a3a",color:selectedDays.includes(d)?"#fff":"#6e6e88" }}>{d}</button>
                  ))}
                </div>
                <p style={{ fontSize:"11px",color:"#6e6e88",margin:"8px 0 0" }}>{selectedDays.length} dia(s) selecionado(s)</p>
              </div>
            )}
          </div>
        )}
        {/* Show locked day info when editing or prefilling */}
        {(isEdit || isPrefill) && (
          <div style={{ marginBottom:"20px" }}>
            <label style={lbl}>Dia</label>
            <div style={{ display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",background:"#0d0d14",borderRadius:"8px",border:"1px solid #2a2a3a" }}>
              <span style={{ fontSize:"20px" }}>📅</span>
              <div>
                <div style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa" }}>Dia {editEntry.day} de {editEntry.month}{editEntry.year ? " " + editEntry.year : ""}</div>
                <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"1px" }}>{editEntry.consultor}</div>
              </div>
            </div>
          </div>
        )}
        {/* Notificação por e-mail */}
        <div style={{ display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",background:"#0d0d14",borderRadius:"8px",border:"1px solid #2a2a3a",marginBottom:"16px" }}>
          <input
            type="checkbox"
            id="notifyEmailChk"
            checked={notifyEmail}
            onChange={e=>setNotifyEmail(e.target.checked)}
            style={{ width:"16px",height:"16px",cursor:"pointer",accentColor:"#3b82f6" }}
          />
          <label htmlFor="notifyEmailChk" style={{ fontSize:"13px",color:"#6e6e88",cursor:"pointer",userSelect:"none" }}>
            📧 Notificar por e-mail
            {isEdit
              ? <span style={{ fontSize:"11px",color:"#6e6e88",marginLeft:"6px" }}>(consultor + quem incluiu, se diferente)</span>
              : <span style={{ fontSize:"11px",color:"#6e6e88",marginLeft:"6px" }}>(consultor + você)</span>
            }
          </label>
        </div>
        <div style={{ display:"flex",gap:"10px",justifyContent:"flex-end",paddingTop:"4px" }}>
          <button onClick={onClose} style={{ padding:"10px 20px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontWeight:600,fontSize:"13px",fontFamily:"inherit" }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding:"10px 24px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"13px",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44" }}>{isEdit?"Salvar alterações":"Adicionar agenda"}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DE E-MAIL (tab dentro de Cadastros)
// ─────────────────────────────────────────────────────────────────────────────
function EmailConfigTab({ emailConfig, onSave }) {
  const [publicKey,  setPublicKey]  = useState(emailConfig.publicKey  || "");
  const [serviceId,  setServiceId]  = useState(emailConfig.serviceId  || "");
  const [templateId, setTemplateId] = useState(emailConfig.templateId || "");
  const [enabled,    setEnabled]    = useState(emailConfig.enabled    || false);
  const [fromName,   setFromName]   = useState(emailConfig.fromName   || "GSC - Gestão Serviço Consultor");
  const [testStatus, setTestStatus] = useState(null); // null | "sending" | "ok" | "err"

  const inp = { padding:"8px 12px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"13px",width:"100%",boxSizing:"border-box",fontFamily:"monospace" };
  const lbl = { fontSize:"12px",color:"#6e6e88",fontWeight:600,display:"block",marginBottom:"6px" };
  const card = { background:"#18181f",borderRadius:"12px",padding:"20px",border:"1px solid #2a2a3a" };

  const isConfigured = publicKey.trim() && serviceId.trim() && templateId.trim();

  const handleTestSend = async () => {
    if (!isConfigured) return;
    setTestStatus("sending");
    try {
      const loadEJ = () => new Promise((resolve, reject) => {
        if (window.emailjs) { resolve(window.emailjs); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        s.onload = () => { window.emailjs.init({ publicKey: publicKey.trim() }); resolve(window.emailjs); };
        s.onerror = reject;
        document.head.appendChild(s);
      });
      const ej = await loadEJ();
      // re-init with current key
      ej.init({ publicKey: publicKey.trim() });
      // dummy test
      await ej.send(serviceId.trim(), templateId.trim(), {
        to_name: "Administrador", to_email: emailConfig._testEmail || "teste@email.com",
        assunto: "✅ Teste de configuração — Agenda de Consultores",
        corpo: "<p>Este é um e-mail de teste enviado pelo sistema Agenda de Consultores.</p><p>Se você recebeu esta mensagem, a configuração está correta!</p>",
        acao:"teste", consultor:"—", cliente:"—", mes_ano:"—", dias:"—", horario:"—", atividades:"—", realizado_por:"Admin",
      });
      setTestStatus("ok");
      setTimeout(() => setTestStatus(null), 4000);
    } catch(e) {
      setTestStatus("err");
      console.error(e);
      setTimeout(() => setTestStatus(null), 5000);
    }
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"24px" }}>
      {/* LEFT – form */}
      <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
        <div style={card}>
          <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"16px" }}>⚙️ Credenciais EmailJS</h3>
          <p style={{ fontSize:"12px",color:"#6e6e88",marginTop:0,marginBottom:"16px",lineHeight:"1.6" }}>
            Configure sua conta em{" "}
            <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" style={{ color:"#6c63ff" }}>emailjs.com</a>{" "}
            (plano gratuito inclui 200 e-mails/mês).
          </p>

          {/* Enable toggle */}
          <div style={{ display:"flex",alignItems:"center",gap:"12px",padding:"10px 14px",background:"#0d0d14",borderRadius:"8px",border:"1px solid #2a2a3a",marginBottom:"16px",cursor:"pointer" }} onClick={()=>setEnabled(e=>!e)}>
            <div style={{ width:"40px",height:"22px",borderRadius:"11px",background:enabled?"#22c55e":"#2a2a3a",position:"relative",transition:"background .2s",flexShrink:0 }}>
              <div style={{ position:"absolute",top:"3px",left:enabled?"21px":"3px",width:"16px",height:"16px",borderRadius:"50%",background:"#fff",transition:"left .2s" }}/>
            </div>
            <span style={{ fontSize:"13px",fontWeight:600,color:enabled?"#22c55e":"#6e6e88" }}>
              {enabled ? "✅ Envio de e-mails ativado" : "⭕ Envio de e-mails desativado"}
            </span>
          </div>

          <div style={{ display:"flex",flexDirection:"column",gap:"14px" }}>
            <div>
              <label style={lbl}>🔑 Public Key <span style={{ color:"#6e6e88",fontWeight:400 }}>(Account → API Keys)</span></label>
              <input value={publicKey} onChange={e=>setPublicKey(e.target.value)} placeholder="ex: aBcDeFgHiJkLmNoP" style={inp}/>
            </div>
            <div>
              <label style={lbl}>📡 Service ID <span style={{ color:"#6e6e88",fontWeight:400 }}>(Email Services)</span></label>
              <input value={serviceId} onChange={e=>setServiceId(e.target.value)} placeholder="ex: service_xxxxxxx" style={inp}/>
            </div>
            <div>
              <label style={lbl}>📄 Template ID <span style={{ color:"#6e6e88",fontWeight:400 }}>(Email Templates)</span></label>
              <input value={templateId} onChange={e=>setTemplateId(e.target.value)} placeholder="ex: template_xxxxxxx" style={inp}/>
            </div>
            <div>
              <label style={lbl}>✉️ Nome do Remetente <span style={{ color:"#6e6e88",fontWeight:400 }}>(aparece no campo "De:" do e-mail)</span></label>
              <input value={fromName} onChange={e=>setFromName(e.target.value)} placeholder="ex: GSC - Gestão Serviço Consultor" style={{...inp, fontFamily:"inherit"}}/>
              <span style={{ fontSize:"11px",color:"#3e3e55",marginTop:"4px",display:"block" }}>Este nome aparecerá como remetente em todos os e-mails enviados pelo sistema.</span>
            </div>
          </div>

          <div style={{ display:"flex",gap:"10px",marginTop:"20px",alignItems:"center",flexWrap:"wrap" }}>
            <button
              onClick={()=>onSave({ enabled, publicKey:publicKey.trim(), serviceId:serviceId.trim(), templateId:templateId.trim(), fromName:fromName.trim()||"GSC - Gestão Serviço Consultor" })}
              style={{ padding:"10px 24px",borderRadius:"8px",border:"none",background:"#6c63ff",color:"#fff",fontWeight:700,fontSize:"13px",cursor:"pointer" }}>
              💾 Salvar configuração
            </button>
            <button
              onClick={handleTestSend}
              disabled={!isConfigured || testStatus==="sending"}
              style={{ padding:"10px 20px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"transparent",color:isConfigured?"#6e6e88":"#2a2a3a",fontWeight:600,fontSize:"13px",cursor:isConfigured?"pointer":"default" }}>
              {testStatus==="sending"?"⏳ Enviando...":"📧 Enviar e-mail de teste"}
            </button>
            {testStatus==="ok"  && <span style={{ fontSize:"12px",color:"#22d3a0",fontWeight:600 }}>✅ E-mail de teste enviado!</span>}
            {testStatus==="err" && <span style={{ fontSize:"12px",color:"#ef4444",fontWeight:600 }}>❌ Falha — verifique as credenciais</span>}
          </div>
        </div>
      </div>

      {/* RIGHT – instructions */}
      <div style={{ display:"flex",flexDirection:"column",gap:"16px" }}>
        <div style={card}>
          <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"12px" }}>📋 Como configurar (passo a passo)</h3>
          <ol style={{ margin:0,paddingLeft:"18px",display:"flex",flexDirection:"column",gap:"10px" }}>
            {[
              <>Acesse <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" style={{color:"#6c63ff"}}>emailjs.com</a> e crie uma conta grátis.</>,
              <>Vá em <strong style={{color:"#f0f0fa"}}>Email Services</strong> → conecte seu Gmail ou Outlook → copie o <code style={{color:"#f59e0b",background:"#18181f",padding:"1px 5px",borderRadius:"4px"}}>Service ID</code>.</>,
              <>Vá em <strong style={{color:"#f0f0fa"}}>Email Templates</strong> → crie um novo template com as variáveis ao lado → copie o <code style={{color:"#f59e0b",background:"#18181f",padding:"1px 5px",borderRadius:"4px"}}>Template ID</code>.</>,
              <>Vá em <strong style={{color:"#f0f0fa"}}>Account → API Keys</strong> → copie a <code style={{color:"#f59e0b",background:"#18181f",padding:"1px 5px",borderRadius:"4px"}}>Public Key</code>.</>,
              <>Preencha os campos ao lado, ative o envio e clique em <strong style={{color:"#f0f0fa"}}>Salvar</strong>.</>,
            ].map((step,i)=>(
              <li key={i} style={{ fontSize:"12px",color:"#6e6e88",lineHeight:"1.6" }}>{step}</li>
            ))}
          </ol>
        </div>

        <div style={card}>
          <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"12px" }}>📄 Template sugerido no EmailJS</h3>
          <p style={{ fontSize:"11px",color:"#6e6e88",marginTop:0,marginBottom:"10px" }}>Configure seu template com estes campos:</p>
          <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
            {[
              ["To Email",  "{{to_email}}",  "E-mail do destinatário (obrigatório)"],
              ["To Name",   "{{to_name}}",   "Nome do destinatário"],
              ["Subject",   "{{assunto}}",   "Assunto gerado automaticamente pelo sistema"],
              ["Content",   "{{corpo}}",     "Corpo HTML gerado automaticamente"],
            ].map(([field,variable,desc])=>(
              <div key={field} style={{ padding:"8px 10px",background:"#0d0d14",borderRadius:"6px",border:"1px solid #18181f" }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"2px" }}>
                  <span style={{ fontSize:"11px",fontWeight:700,color:"#f0f0fa" }}>{field}</span>
                  <code style={{ fontSize:"11px",color:"#f59e0b",background:"#18181f",padding:"1px 6px",borderRadius:"4px" }}>{variable}</code>
                </div>
                <span style={{ fontSize:"10px",color:"#6e6e88" }}>{desc}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:"12px",padding:"8px 10px",background:"#0d0d14",borderRadius:"6px",border:"1px solid #18181f" }}>
            <p style={{ fontSize:"11px",color:"#6e6e88",margin:0,lineHeight:"1.6" }}>
              <strong style={{color:"#f59e0b"}}>Assunto gerado:</strong> "Agenda incluída: Dia 17 — VEDACIT (Março 2026)"<br/>
              <strong style={{color:"#f59e0b"}}>Corpo:</strong> tabela HTML com dia, horário, cliente e atividades.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO DE CADASTROS (Consultores, Clientes, Projetos)
// ─────────────────────────────────────────────────────────────────────────────
function CadastrosView({ consultores, clients, projects, onAddConsultor, onRemoveConsultor, onUpdateConsultor, onAddClient, onRemoveClient, onUpdateClient, onAddProject, onRemoveProject, onUpdateProject, emailConfig, onSaveEmailConfig }) {
  const [tab, setTab] = useState("consultores");

  // ── Consultor form ──
  const [newC, setNewC] = useState({ name:"", codigo:"", email:"" });
  const [editC, setEditC] = useState(null); // { idx, name, codigo, email }

  // ── Cliente form ──
  const [newCl, setNewCl] = useState({ name:"", codigo:"", email:"", emailOS:"", color:"#6c63ff" });
  const [editCl, setEditCl] = useState(null);

  // ── Projeto form ──
  const [newP, setNewP] = useState({ name:"", codigo:"", client:"", codigoCliente:"", description:"" });
  const [editP, setEditP] = useState(null);

  const inp = { padding:"8px 12px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"13px",width:"100%",boxSizing:"border-box" };
  const lbl = { fontSize:"12px",color:"#6e6e88",fontWeight:600,display:"block",marginBottom:"6px" };
  const card = { background:"#18181f",borderRadius:"12px",padding:"20px",border:"1px solid #2a2a3a" };
  const btnGreen = { padding:"10px",borderRadius:"8px",border:"none",background:"#22d3a0",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:"13px",width:"100%" };
  const btnBlue  = { padding:"10px",borderRadius:"8px",border:"none",background:"#6c63ff",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:"13px",width:"100%" };
  const btnRed   = { background:"#ef444422",border:"1px solid #ef444444",color:"#ef4444",borderRadius:"6px",padding:"5px 10px",cursor:"pointer",fontSize:"12px",fontWeight:600 };
  const btnEdit  = { background:"#6c63ff22",border:"1px solid #3b82f644",color:"#6c63ff",borderRadius:"6px",padding:"5px 10px",cursor:"pointer",fontSize:"12px",fontWeight:600 };

  const tabs = [["consultores","👥 Consultores"],["clientes","🏢 Clientes"],["projetos","📋 Projetos"],["grade","🎓 Grade de Conhecimento"],["email","📧 E-mail"]];
  const [gradeConsultor, setGradeConsultor] = React.useState(consultores[0]||"");

  // Enriquece consultores com meta se disponível
  const consultoresMeta = (window.__consultoresMeta||[]);
  const getMeta = (name) => consultoresMeta.find(c=>c.name===name) || { name, codigo:"", email:"" };

  return (
    <div>
      <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:700,color:"#f0f0fa",marginBottom:"20px" }}>🗂 Cadastros</h2>
      <div style={{ display:"flex",gap:"8px",marginBottom:"24px",flexWrap:"wrap" }}>
        {tabs.map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ padding:"8px 20px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"13px",background:tab===id?"#3b82f6":"#18181f",color:tab===id?"#fff":"#6e6e88" }}>{label}</button>
        ))}
      </div>

      {/* ─────────── CONSULTORES ─────────── */}
      {tab==="consultores" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px" }}>
          {/* Formulário */}
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"16px" }}>
              {editC ? "✏️ Editar Consultor" : "➕ Novo Consultor"}
            </h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
              <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:"10px" }}>
                <div>
                  <label style={lbl}>Nome completo</label>
                  <input value={editC?editC.name:newC.name} onChange={e=>editC?setEditC(v=>({...v,name:e.target.value})):setNewC(v=>({...v,name:e.target.value}))} placeholder="Ex: João Silva" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Código</label>
                  <input value={editC?editC.codigo:newC.codigo} onChange={e=>editC?setEditC(v=>({...v,codigo:e.target.value})):setNewC(v=>({...v,codigo:e.target.value}))} placeholder="Ex: C001" style={inp}/>
                </div>
              </div>
              <div>
                <label style={lbl}>E-mail</label>
                <input type="email" value={editC?editC.email:newC.email} onChange={e=>editC?setEditC(v=>({...v,email:e.target.value})):setNewC(v=>({...v,email:e.target.value}))} placeholder="consultor@empresa.com" style={inp}/>
              </div>
              <div style={{ display:"flex",gap:"8px" }}>
                {editC ? (
                  <>
                    <button onClick={()=>{ if(!editC.name.trim()) return; onUpdateConsultor(editC._orig, editC); setEditC(null); }} style={btnBlue}>💾 Salvar alterações</button>
                    <button onClick={()=>setEditC(null)} style={{ ...btnBlue,background:"#2a2a3a",width:"auto",padding:"10px 16px" }}>Cancelar</button>
                  </>
                ) : (
                  <button onClick={()=>{ if(!newC.name.trim()) return; onAddConsultor(newC); setNewC({name:"",codigo:"",email:""}); }} style={btnGreen}>✅ Cadastrar Consultor</button>
                )}
              </div>
            </div>
          </div>

          {/* Lista */}
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"16px" }}>👥 Consultores Cadastrados ({consultores.length})</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"8px",maxHeight:"360px",overflowY:"auto" }}>
              {consultores.map((c,i)=>{
                const meta = getMeta(c);
                return (
                  <div key={c} style={{ padding:"10px 12px",background:"#0d0d14",borderRadius:"8px",border:"1px solid #18181f" }}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:"10px",minWidth:0 }}>
                        <div style={{ width:"32px",height:"32px",borderRadius:"50%",background:"hsl("+(i*29%360)+",65%,50%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:700,color:"#fff",flexShrink:0 }}>{getInitials(c)}</div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:"13px",color:"#c8c8d8",fontWeight:600,display:"flex",alignItems:"center",gap:"6px" }}>
                            {c}
                            {meta.codigo && <span style={{ fontSize:"10px",background:"#2a2a3a",color:"#6e6e88",padding:"1px 6px",borderRadius:"10px" }}>{meta.codigo}</span>}
                          </div>
                          {meta.email && <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>✉️ {meta.email}</div>}
                        </div>
                      </div>
                      <div style={{ display:"flex",gap:"6px",flexShrink:0,marginLeft:"8px" }}>
                        <button onClick={()=>setEditC({...meta,_orig:c})} style={btnEdit}>✏️</button>
                        <button onClick={()=>{ if(window.confirm("Remover "+c+"? Todos os agendamentos serão perdidos.")) onRemoveConsultor(c); }} style={btnRed}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────── CLIENTES ─────────── */}
      {tab==="clientes" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px" }}>
          {/* Formulário */}
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"16px" }}>
              {editCl ? "✏️ Editar Cliente" : "➕ Novo Cliente"}
            </h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
              <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:"10px" }}>
                <div>
                  <label style={lbl}>Nome do cliente</label>
                  <input value={editCl?editCl.name:newCl.name} onChange={e=>{ const v=e.target.value.toUpperCase(); editCl?setEditCl(x=>({...x,name:v})):setNewCl(x=>({...x,name:v})); }} placeholder="Ex: EMPRESA SA" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Código</label>
                  <input value={editCl?editCl.codigo:newCl.codigo} onChange={e=>editCl?setEditCl(x=>({...x,codigo:e.target.value})):setNewCl(x=>({...x,codigo:e.target.value}))} placeholder="Ex: CLI01" style={inp}/>
                </div>
              </div>
              <div>
                <label style={lbl}>E-mail — Responsável por receber OS</label>
                <input value={editCl?editCl.emailOS||editCl.email||"":newCl.emailOS||""} onChange={e=>editCl?setEditCl(x=>({...x,emailOS:e.target.value})):setNewCl(x=>({...x,emailOS:e.target.value}))} placeholder="responsavel@cliente.com" style={inp}/>
                <div style={{ fontSize:"10px",color:"#3e3e55",marginTop:"5px" }}>Para múltiplos e-mails, separe por vírgula: email1@a.com, email2@b.com</div>
              </div>
              <div>
                <label style={lbl}>Cor identificadora</label>
                <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
                  <input type="color" value={editCl?editCl.color:newCl.color} onChange={e=>editCl?setEditCl(x=>({...x,color:e.target.value})):setNewCl(x=>({...x,color:e.target.value}))} style={{ width:"48px",height:"36px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#0d0d14",cursor:"pointer" }}/>
                  <div style={{ flex:1,height:"36px",borderRadius:"8px",background:editCl?editCl.color:newCl.color,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <span style={{ fontSize:"12px",fontWeight:700,color:"#fff",textShadow:"0 1px 3px rgba(0,0,0,0.5)" }}>{(editCl?editCl.name:newCl.name)||"PRÉVIA"}</span>
                  </div>
                </div>
              </div>
              <div style={{ display:"flex",gap:"8px" }}>
                {editCl ? (
                  <>
                    <button onClick={()=>{ if(!editCl.name.trim()) return; onUpdateClient(editCl._orig, editCl); setEditCl(null); }} style={btnBlue}>💾 Salvar alterações</button>
                    <button onClick={()=>setEditCl(null)} style={{ ...btnBlue,background:"#2a2a3a",width:"auto",padding:"10px 16px" }}>Cancelar</button>
                  </>
                ) : (
                  <button onClick={()=>{ if(!newCl.name.trim()) return; onAddClient(newCl); setNewCl({name:"",codigo:"",email:"",emailOS:"",color:"#6c63ff"}); }} style={btnGreen}>✅ Cadastrar Cliente</button>
                )}
              </div>
            </div>
          </div>

          {/* Lista */}
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"16px" }}>🏢 Clientes Cadastrados ({clients.length})</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"8px",maxHeight:"380px",overflowY:"auto" }}>
              {clients.map(c=>(
                <div key={c.name} style={{ padding:"10px 12px",background:"#0d0d14",borderRadius:"8px",border:"1px solid #18181f" }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"10px",minWidth:0 }}>
                      <div style={{ width:"14px",height:"14px",borderRadius:"3px",background:c.color,flexShrink:0 }}/>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:"13px",color:"#c8c8d8",fontWeight:600,display:"flex",alignItems:"center",gap:"6px" }}>
                          {c.name}
                          {c.codigo && <span style={{ fontSize:"10px",background:"#2a2a3a",color:"#6e6e88",padding:"1px 6px",borderRadius:"10px" }}>{c.codigo}</span>}
                        </div>
                        {(c.emailOS||c.email) && <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>✉️ OS: {c.emailOS||c.email}</div>}
                      </div>
                    </div>
                    <div style={{ display:"flex",gap:"6px",flexShrink:0,marginLeft:"8px" }}>
                      <button onClick={()=>setEditCl({...c,_orig:c.name})} style={btnEdit}>✏️</button>
                      <button onClick={()=>onRemoveClient(c.name)} style={btnRed}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────── PROJETOS ─────────── */}
      {tab==="projetos" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px" }}>
          {/* Formulário */}
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"16px" }}>
              {editP ? "✏️ Editar Projeto" : "➕ Novo Projeto"}
            </h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
              <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:"10px" }}>
                <div>
                  <label style={lbl}>Nome do projeto</label>
                  <input value={editP?editP.name:newP.name} onChange={e=>editP?setEditP(v=>({...v,name:e.target.value})):setNewP(v=>({...v,name:e.target.value}))} placeholder="Ex: Implantação Módulo Fiscal" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Código</label>
                  <input value={editP?editP.codigo:newP.codigo} onChange={e=>editP?setEditP(v=>({...v,codigo:e.target.value})):setNewP(v=>({...v,codigo:e.target.value}))} placeholder="Ex: P001" style={inp}/>
                </div>
              </div>
              <div>
                <label style={lbl}>Cliente</label>
                <select value={editP?editP.client:newP.client} onChange={e=>{
                  const nome = e.target.value;
                  const cli = clients.find(c=>c.name===nome);
                  if (editP) setEditP(v=>({...v,client:nome,codigoCliente:cli?.codigo||v.codigoCliente||""}));
                  else setNewP(v=>({...v,client:nome,codigoCliente:cli?.codigo||""}));
                }} style={inp}>
                  <option value="">Selecione o cliente...</option>
                  {clients.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Código do Cliente</label>
                <input value={editP?editP.codigoCliente||"":newP.codigoCliente||""} onChange={e=>editP?setEditP(v=>({...v,codigoCliente:e.target.value})):setNewP(v=>({...v,codigoCliente:e.target.value}))} placeholder="Preenchido automaticamente" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Descrição (opcional)</label>
                <input value={editP?editP.description:newP.description} onChange={e=>editP?setEditP(v=>({...v,description:e.target.value})):setNewP(v=>({...v,description:e.target.value}))} placeholder="Breve descrição do projeto..." style={inp}/>
              </div>
              <div style={{ display:"flex",gap:"8px" }}>
                {editP ? (
                  <>
                    <button onClick={()=>{ if(!editP.name.trim()||!editP.client) return; onUpdateProject(editP._idx,editP); setEditP(null); }} style={btnBlue}>💾 Salvar alterações</button>
                    <button onClick={()=>setEditP(null)} style={{ ...btnBlue,background:"#2a2a3a",width:"auto",padding:"10px 16px" }}>Cancelar</button>
                  </>
                ) : (
                  <button onClick={()=>{ if(!newP.name.trim()||!newP.client) return; onAddProject({...newP}); setNewP({name:"",codigo:"",client:"",codigoCliente:"",description:""}); }} style={btnGreen}>✅ Cadastrar Projeto</button>
                )}
              </div>
            </div>
          </div>

          {/* Lista */}
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"16px" }}>📋 Projetos Cadastrados ({projects.length})</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"8px",maxHeight:"380px",overflowY:"auto" }}>
              {projects.length===0 && <p style={{ color:"#6e6e88",fontSize:"13px",textAlign:"center",padding:"20px" }}>Nenhum projeto cadastrado ainda.</p>}
              {projects.map((p,i)=>(
                <div key={i} style={{ padding:"10px 14px",background:"#0d0d14",borderRadius:"8px",border:"1px solid #18181f" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px" }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:"13px",color:"#f0f0fa",fontWeight:700,display:"flex",alignItems:"center",gap:"6px" }}>
                        {p.name}
                        {p.codigo && <span style={{ fontSize:"10px",background:"#2a2a3a",color:"#6e6e88",padding:"1px 6px",borderRadius:"10px" }}>{p.codigo}</span>}
                      </div>
                      <div style={{ fontSize:"11px",color:getClientColor(p.client),fontWeight:600,marginTop:"3px" }}>
                        {p.client}
                        {p.codigoCliente && <span style={{ color:"#6e6e88",fontWeight:400,marginLeft:"6px" }}>cod. {p.codigoCliente}</span>}
                      </div>
                      {p.description && <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"4px" }}>{p.description}</div>}
                    </div>
                    <div style={{ display:"flex",gap:"6px",flexShrink:0 }}>
                      <button onClick={()=>setEditP({...p,_idx:i})} style={btnEdit}>✏️</button>
                      <button onClick={()=>onRemoveProject(i)} style={btnRed}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────── GRADE DE CONHECIMENTO CONSULTORES ─────────── */}
      {tab==="grade" && (
        <GradeAdminView consultores={consultores}/>
      )}

      {/* ─────────── E-MAIL ─────────── */}
      {tab==="email" && (
        <EmailConfigTab emailConfig={emailConfig||{}} onSave={onSaveEmailConfig}/>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL ORDEM DE SERVIÇO (consultor preenche OS em agenda existente)
// ─────────────────────────────────────────────────────────────────────────────
function OrdemServicoModal({ entry, consultorName, emailConfig, clientList, onSave, onClose }) {
  const [horaInicio,  setHoraInicio]  = useState(entry.horaInicio  || "08:00");
  const [horaFim,     setHoraFim]     = useState(entry.horaFim     || "17:00");
  const [intervalo,   setIntervalo]   = useState(entry.intervalo   || "");
  const [atividades,  setAtividades]  = useState(entry.atividades  || "");
  const [osNumero,    setOsNumero]    = useState(entry.osNumero    || "");
  const [osDescricao, setOsDescricao] = useState(entry.osDescricao || "");
  const [osSistema,   setOsSistema]   = useState(entry.osSistema   || "");
  const [osStatus,    setOsStatus]    = useState(entry.osStatus    || "em_andamento");
  const [saving,      setSaving]      = useState(false);
  const [sendingEmail,setSendingEmail]= useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Buscar e-mail OS do cliente cadastrado (emailOS tem prioridade, fallback para email)
  const clienteCadastrado = (clientList||[]).find(c =>
    c.name && entry.client && c.name.toUpperCase() === entry.client.toUpperCase()
  );
  const emailClienteOS = clienteCadastrado?.emailOS || clienteCadastrado?.email || "";

  // Preencher destinatário: preferência ao salvo na OS, fallback ao cadastro do cliente
  const [emailDest, setEmailDest] = useState(entry.osEmailDest || emailClienteOS);

  const OS_STATUS = {
    em_andamento: { label:"Em andamento", color:"#6c63ff", bg:"#6c63ff18" },
    concluida:    { label:"Concluída",    color:"#22d3a0", bg:"#22d3a018" },
    pendente:     { label:"Pendente",     color:"#f5a623", bg:"#f5a62318" },
    cancelada:    { label:"Cancelada",    color:"#f04f5e", bg:"#f04f5e18" },
  };

  // Gerar número sequencial ao abrir (somente se não tiver ainda)
  useEffect(() => {
    if (entry.osNumero) return; // já tem número
    const gerarNumero = async () => {
      try {
        const snap = await getDoc(doc(db, "app_data", "os_sequencial"));
        const atual = snap.exists() ? (snap.data().value || 0) : 0;
        const proximo = atual + 1;
        const numero = "OS-" + String(proximo).padStart(4, "0");
        await setDoc(doc(db, "app_data", "os_sequencial"), { value: proximo });
        setOsNumero(numero);
      } catch(e) {
        // fallback: usar timestamp se Firestore falhar
        setOsNumero("OS-" + Date.now().toString().slice(-6));
      }
    };
    gerarNumero();
  }, []);

  const duracaoUtil = () => {
    if (!horaInicio || !horaFim || horaInicio >= horaFim) return null;
    const [hi,mi] = horaInicio.split(":").map(Number);
    const [hf,mf] = horaFim.split(":").map(Number);
    const total = (hf*60+mf) - (hi*60+mi) - (Number(intervalo)||0);
    if (total <= 0) return null;
    const h = Math.floor(total/60), m = total%60;
    return `${h}h${m>0?" "+m+"min":""}`;
  };

  const buildOsData = () => ({
    ...entry,
    consultor: entry.consultor || consultorName,
    horaInicio, horaFim, intervalo,
    atividades: atividades.trim(),
    osNumero,
    osDescricao: osDescricao.trim(),
    osSistema: osSistema.trim(),
    osStatus,
    osEmailDest: emailDest,
    osPreenchidaEm: new Date().toISOString(),
    osPreenchidaPor: consultorName,
  });

  const handleSave = async () => {
    setSaving(true);
    await onSave(buildOsData());
    setSaving(false);
    onClose();
  };

  const handleEnviarEmail = async () => {
    if (!emailDest.trim()) { setEmailStatus("erro_dest"); return; }
    const cfg = emailConfig || {};
    // Aceita se tiver credenciais preenchidas mesmo que enabled seja false (fallback)
    const temCredenciais = cfg.publicKey?.trim() && cfg.serviceId?.trim() && cfg.templateId?.trim();
    if (!temCredenciais) {
      setEmailStatus("sem_config"); return;
    }
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      // Salvar antes de enviar
      const osData = buildOsData();
      await onSave(osData);

      // Carregar EmailJS
      const loadEJ = () => new Promise((res, rej) => {
        if (window.emailjs) { window.emailjs.init({ publicKey: cfg.publicKey }); res(window.emailjs); return; }
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
        s.onload = () => { window.emailjs.init({ publicKey: cfg.publicKey }); res(window.emailjs); };
        s.onerror = rej;
        document.head.appendChild(s);
      });
      const ej = await loadEJ();

      const dur = duracaoUtil();
      const horarioTexto = [horaInicio, horaFim?"→ "+horaFim:"", intervalo?"(intervalo: "+intervalo+"min)":""].filter(Boolean).join(" ") || "—";

      const corpo = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#6c63ff,#a78bfa);padding:20px 24px">
            <h2 style="color:#fff;margin:0;font-size:18px">📋 Ordem de Serviço — ${osNumero}</h2>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">${osData.osStatus ? OS_STATUS[osData.osStatus]?.label : ""}</p>
          </div>
          <div style="padding:20px 24px;background:#fff">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              ${[
                ["Consultor", consultorName],
                ["Cliente",   entry.client||"—"],
                ["Data",      `Dia ${entry.day} · ${entry.month} ${entry.year||""}`],
                ["Modalidade",entry.modalidade==="remoto"?"💻 Remoto":"🏢 Presencial"],
                ["Horário",   horarioTexto],
                dur ? ["Tempo útil", dur] : null,
                osSistema ? ["Sistema/Módulo", osSistema] : null,
                osDescricao ? ["Descrição da OS", osDescricao] : null,
              ].filter(Boolean).map(([k,v])=>`
                <tr style="border-bottom:1px solid #f0f0f0">
                  <td style="padding:8px 0;color:#666;width:140px;font-weight:600">${k}</td>
                  <td style="padding:8px 0;color:#333">${v}</td>
                </tr>
              `).join("")}
            </table>
            ${atividades ? `
              <div style="margin-top:16px;padding:14px;background:#f8f8ff;border-radius:6px;border-left:3px solid #6c63ff">
                <div style="font-size:12px;font-weight:700;color:#6c63ff;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Atividades Realizadas</div>
                <div style="font-size:14px;color:#444;line-height:1.6;white-space:pre-wrap">${atividades}</div>
              </div>` : ""}
            <p style="margin-top:20px;font-size:12px;color:#aaa;text-align:center">
              Enviado por ${consultorName} em ${new Date().toLocaleString("pt-BR")} · Sistema GSC
            </p>
          </div>
        </div>`;

      await ej.send(cfg.serviceId, cfg.templateId, {
        to_email:  emailDest.trim(),
        to_name:   emailDest.trim(),
        assunto:   `OS ${osNumero} — ${entry.client||""} · Dia ${entry.day} ${entry.month}`,
        corpo,
        message:   `OS ${osNumero}\nConsultor: ${consultorName}\nCliente: ${entry.client||"—"}\nData: Dia ${entry.day} ${entry.month} ${entry.year||""}\nHorário: ${horarioTexto}\nAtividades: ${atividades||"—"}`,
        from_name: cfg.fromName || `GSC - ${consultorName}`,
      });
      setEmailStatus("ok");
    } catch(e) {
      console.error(e);
      setEmailStatus("erro");
    } finally {
      setSendingEmail(false);
    }
  };

  const inp = { padding:"9px 13px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"13px",width:"100%",boxSizing:"border-box",fontFamily:"inherit" };
  const lbl = { fontSize:"11px",color:"#3e3e55",fontWeight:700,marginBottom:"6px",display:"block",letterSpacing:"0.5px",textTransform:"uppercase" };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",backdropFilter:"blur(6px)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
      <div style={{ background:"#111118",borderRadius:"20px",width:"100%",maxWidth:"540px",maxHeight:"92vh",overflowY:"auto",border:"1px solid #1f1f2e",boxShadow:"0 32px 80px rgba(0,0,0,0.8)",animation:"fadeUp .2s cubic-bezier(.4,0,.2,1)" }}>

        {/* Header */}
        <div style={{ padding:"22px 24px 16px",borderBottom:"1px solid #1f1f2e",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"12px" }}>
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:"10px",marginBottom:"4px" }}>
              <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"17px",fontWeight:900,color:"#f0f0fa",margin:0,letterSpacing:"-0.3px" }}>📋 Ordem de Serviço</h2>
              {osNumero
                ? <span style={{ padding:"3px 10px",borderRadius:"99px",background:"#6c63ff22",border:"1px solid #6c63ff44",fontSize:"12px",fontWeight:700,color:"#a78bfa" }}>{osNumero}</span>
                : <span style={{ padding:"3px 10px",borderRadius:"99px",background:"#1f1f2e",fontSize:"11px",color:"#3e3e55" }}>Gerando nº...</span>
              }
            </div>
            <div style={{ fontSize:"12px",color:"#3e3e55",display:"flex",gap:"10px",flexWrap:"wrap" }}>
              <span>🏢 {entry.client||entry.type}</span>
              <span>📅 Dia {entry.day} · {entry.month} {entry.year||""}</span>
              <span style={{ color:entry.modalidade==="remoto"?"#a78bfa":"#22d3a0" }}>
                {entry.modalidade==="remoto"?"💻 Remoto":"🏢 Presencial"}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"#1f1f2e",border:"1px solid #2a2a3a",color:"#6e6e88",borderRadius:"10px",width:"32px",height:"32px",cursor:"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>✕</button>
        </div>

        <div style={{ padding:"20px 24px",display:"flex",flexDirection:"column",gap:"16px" }}>

          {/* Dados da OS */}
          <div style={{ background:"#0d0d14",borderRadius:"12px",border:"1px solid #1f1f2e",padding:"14px 16px" }}>
            <div style={{ fontSize:"11px",color:"#6c63ff",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"12px" }}>Dados da OS</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
              <div>
                <label style={lbl}>Nº da OS</label>
                <div style={{ ...inp, background:"#18181f", color:"#6e6e88", display:"flex", alignItems:"center", gap:"8px", userSelect:"text" }}>
                  <span style={{ fontSize:"12px" }}>🔒</span>
                  <span style={{ fontWeight:700, color:"#a78bfa" }}>{osNumero || "Gerando..."}</span>
                </div>
              </div>
              <div>
                <label style={lbl}>Sistema / Módulo</label>
                <input value={osSistema} onChange={e=>setOsSistema(e.target.value)} placeholder="Ex: Protheus SIGAFIN" style={inp}/>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Descrição da OS</label>
                <textarea value={osDescricao} onChange={e=>setOsDescricao(e.target.value)} rows={2}
                  placeholder="Descreva o objetivo e escopo da ordem de serviço..."
                  style={{...inp,resize:"vertical",lineHeight:1.5}}/>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Status</label>
                <div style={{ display:"flex",gap:"6px",flexWrap:"wrap" }}>
                  {Object.entries(OS_STATUS).map(([k,v])=>(
                    <button key={k} onClick={()=>setOsStatus(k)}
                      style={{ padding:"6px 14px",borderRadius:"99px",border:"1px solid "+(osStatus===k?v.color:"#2a2a3a"),background:osStatus===k?v.bg:"transparent",color:osStatus===k?v.color:"#6e6e88",fontSize:"12px",fontWeight:osStatus===k?700:400,cursor:"pointer",fontFamily:"inherit",transition:"all .15s" }}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Horários */}
          <div style={{ background:"#0d0d14",borderRadius:"12px",border:"1px solid #1f1f2e",padding:"14px 16px" }}>
            <div style={{ fontSize:"11px",color:"#22d3a0",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"12px" }}>⏰ Controle de Tempo</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
              <div>
                <label style={lbl}>Início</label>
                <input type="time" value={horaInicio} onChange={e=>setHoraInicio(e.target.value)} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Fim</label>
                <input type="time" value={horaFim} onChange={e=>setHoraFim(e.target.value)} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Intervalo (min)</label>
                <input type="number" min="0" max="240" step="15" value={intervalo} onChange={e=>setIntervalo(e.target.value)} placeholder="Ex: 60" style={inp}/>
              </div>
            </div>
            {duracaoUtil() && (
              <div style={{ marginTop:"10px",padding:"8px 12px",borderRadius:"8px",background:"#22d3a010",border:"1px solid #22d3a030",fontSize:"12px",color:"#22d3a0",fontWeight:600 }}>
                ⏱ Tempo útil: <strong>{duracaoUtil()}</strong>
                {intervalo && <span style={{ color:"#6e6e88",fontWeight:400 }}> (descontando {intervalo}min de intervalo)</span>}
              </div>
            )}
          </div>

          {/* Atividades */}
          <div>
            <label style={lbl}>📝 Atividades realizadas</label>
            <textarea value={atividades} onChange={e=>setAtividades(e.target.value)} rows={4}
              placeholder={"Descreva as atividades realizadas durante este atendimento...\n\nEx:\n- Configuração do módulo SIGAFIN\n- Treinamento de usuários\n- Validação de relatórios"}
              style={{...inp,resize:"vertical",lineHeight:1.6,minHeight:"100px"}}/>
          </div>

          {/* Envio de e-mail */}
          <div style={{ background:"#0d0d14",borderRadius:"12px",border:"1px solid #1f1f2e",padding:"14px 16px" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:showEmailForm?"12px":"0" }}>
              <div style={{ fontSize:"11px",color:"#f5a623",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase" }}>✉️ Enviar por E-mail</div>
              <button onClick={()=>setShowEmailForm(v=>!v)}
                style={{ fontSize:"11px",background:"none",border:"none",color:"#6c63ff",cursor:"pointer",fontWeight:600,fontFamily:"inherit" }}>
                {showEmailForm?"▴ Ocultar":"▾ Expandir"}
              </button>
            </div>
            {showEmailForm && (
              <div>
            <div>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"6px" }}>
                  <label style={lbl}>Destinatário(s)</label>
                  {emailClienteOS && emailDest !== emailClienteOS && (
                    <button onClick={()=>setEmailDest(emailClienteOS)}
                      style={{ fontSize:"10px",background:"none",border:"none",color:"#6c63ff",cursor:"pointer",fontWeight:600,fontFamily:"inherit" }}>
                      ↩ Usar e-mail do cliente
                    </button>
                  )}
                </div>
                <div style={{ position:"relative" }}>
                  <input value={emailDest} onChange={e=>{setEmailDest(e.target.value);setEmailStatus(null);}}
                    placeholder="responsavel@cliente.com"
                    style={{...inp, paddingRight: emailClienteOS?"110px":"13px"}}/>
                  {emailClienteOS && emailDest === emailClienteOS && (
                    <span style={{ position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",fontSize:"9px",color:"#22d3a0",fontWeight:700,background:"#22d3a015",padding:"2px 6px",borderRadius:"99px",pointerEvents:"none",whiteSpace:"nowrap" }}>
                      📋 do cadastro
                    </span>
                  )}
                </div>
                <div style={{ fontSize:"10px",color:"#3e3e55",marginTop:"5px",lineHeight:1.5 }}>
                  Para múltiplos destinatários, separe por <strong style={{ color:"#6e6e88" }}>vírgula</strong>: <span style={{ color:"#6e6e88" }}>email1@a.com, email2@b.com</span>
                </div>
              </div>
                <div style={{ marginTop:"10px" }}>
                  <button onClick={handleEnviarEmail} disabled={sendingEmail||!osNumero}
                    style={{ width:"100%",padding:"10px",borderRadius:"10px",border:"none",background:sendingEmail?"#2a2a3a":"linear-gradient(135deg,#f5a623,#f59e0b)",color:"#fff",fontWeight:700,fontSize:"13px",cursor:sendingEmail||!osNumero?"not-allowed":"pointer",fontFamily:"inherit",opacity:!osNumero?0.5:1 }}>
                    {sendingEmail?"⏳ Enviando...":"📧 Enviar OS por e-mail"}
                  </button>
                </div>
                {emailStatus==="ok" && (
                  <div style={{ marginTop:"8px",padding:"8px 12px",borderRadius:"8px",background:"#22d3a015",border:"1px solid #22d3a044",fontSize:"12px",color:"#22d3a0",fontWeight:600 }}>
                    ✅ E-mail enviado com sucesso!
                  </div>
                )}
                {emailStatus==="erro" && (
                  <div style={{ marginTop:"8px",padding:"8px 12px",borderRadius:"8px",background:"#f04f5e15",border:"1px solid #f04f5e44",fontSize:"12px",color:"#f04f5e" }}>
                    ❌ Falha ao enviar. Verifique as configurações de e-mail em Cadastros.
                  </div>
                )}
                {emailStatus==="sem_config" && (() => {
                  const cfg = emailConfig || {};
                  const faltam = [
                    !cfg.publicKey?.trim() && "Public Key",
                    !cfg.serviceId?.trim() && "Service ID",
                    !cfg.templateId?.trim() && "Template ID",
                  ].filter(Boolean);
                  return (
                    <div style={{ marginTop:"8px",padding:"8px 12px",borderRadius:"8px",background:"#f5a62315",border:"1px solid #f5a62344",fontSize:"12px",color:"#f5a623" }}>
                      ⚠️ {faltam.length > 0
                        ? `Faltam as credenciais: ${faltam.join(", ")}. Configure em Cadastros → E-mail.`
                        : "Configure e salve as credenciais em Cadastros → E-mail."}
                    </div>
                  );
                })()}
                {emailStatus==="erro_dest" && (
                  <div style={{ marginTop:"8px",padding:"8px 12px",borderRadius:"8px",background:"#f5a62315",border:"1px solid #f5a62344",fontSize:"12px",color:"#f5a623" }}>
                    ⚠️ Informe o e-mail do destinatário.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Última atualização */}
          {entry.osPreenchidaEm && (
            <div style={{ fontSize:"10px",color:"#3e3e55",textAlign:"right" }}>
              Última atualização: {new Date(entry.osPreenchidaEm).toLocaleString("pt-BR")} por {entry.osPreenchidaPor}
            </div>
          )}

          {/* Ações */}
          <div style={{ display:"flex",gap:"10px",justifyContent:"flex-end",paddingTop:"4px" }}>
            <button onClick={onClose} style={{ padding:"10px 20px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontWeight:600,fontSize:"13px",fontFamily:"inherit" }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving||!osNumero}
              style={{ padding:"10px 24px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"13px",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44",opacity:saving||!osNumero?0.7:1 }}>
              {saving?"⏳ Salvando...":"💾 Salvar OS"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADE ADMIN VIEW — busca por produto/módulo + visualização por consultor
// ─────────────────────────────────────────────────────────────────────────────
function GradeAdminView({ consultores, scheduleData, onAbrirAgenda }) {
  const [modo, setModo] = React.useState("consultor"); // "consultor" | "busca"
  const [gradeConsultor, setGradeConsultor] = React.useState(consultores[0]||"");

  // Busca
  const [filtroProduto, setFiltroProduto] = React.useState("");
  const [filtroModulo, setFiltroModulo]   = React.useState("");
  const [resultados, setResultados]       = React.useState(null); // null = ainda não buscou
  const [buscando, setBuscando]           = React.useState(false);

  const [consultorDisp, setConsultorDisp] = React.useState(null); // consultor selecionado para ver disponibilidade

  const makeKey = (name) =>
    "grade_" + (name||"").trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"").slice(0,80);

  // Módulos disponíveis para o produto selecionado
  const modulosDoProduto = React.useMemo(() => {
    if (!filtroProduto) {
      // todos os módulos de todos os produtos
      return TOTVS_PRODUTOS.flatMap(p =>
        (TOTVS_MODULOS[p]||[]).map(m => ({ ...m, produto: p }))
      );
    }
    return (TOTVS_MODULOS[filtroProduto]||[]).map(m => ({ ...m, produto: filtroProduto }));
  }, [filtroProduto]);

  const handleBuscar = async () => {
    setBuscando(true);
    setResultados(null);
    try {
      // Carregar grades de todos os consultores em paralelo
      const grades = await Promise.all(
        consultores.map(async (nome) => {
          try {
            const snap = await getDoc(doc(db, "app_data", makeKey(nome)));
            const val = snap.exists() ? (snap.data().value || {}) : {};
            return { nome, modulos: val.modulos || {}, produtos: val.produtos || [] };
          } catch { return { nome, modulos: {}, produtos: [] }; }
        })
      );

      // Filtrar por produto e/ou módulo
      const res = [];
      for (const g of grades) {
        const entries = Object.entries(g.modulos); // [modId, nivel]
        for (const [modId, nivel] of entries) {
          // Encontrar o módulo em TOTVS_MODULOS
          let modInfo = null, produtoMod = null;
          for (const p of TOTVS_PRODUTOS) {
            const m = (TOTVS_MODULOS[p]||[]).find(x => x.id === modId);
            if (m) { modInfo = m; produtoMod = p; break; }
          }
          if (!modInfo) continue;
          // Aplicar filtros
          if (filtroProduto && produtoMod !== filtroProduto) continue;
          if (filtroModulo && modInfo.id !== filtroModulo) continue;
          res.push({ consultor: g.nome, produto: produtoMod, modId, label: modInfo.label, desc: modInfo.desc, nivel });
        }
      }

      // Agrupar por produto > módulo > consultores
      const agrupado = {};
      for (const r of res) {
        if (!agrupado[r.produto]) agrupado[r.produto] = {};
        if (!agrupado[r.produto][r.modId]) agrupado[r.produto][r.modId] = { label: r.label, desc: r.desc, consultores: [] };
        agrupado[r.produto][r.modId].consultores.push({ nome: r.consultor, nivel: r.nivel });
      }
      setResultados(agrupado);
    } catch(e) {
      setResultados({});
    } finally {
      setBuscando(false);
    }
  };

  const nivelInfo = (id) => NIVEIS.find(n => n.id === id) || { label: id, color: "#6e6e88", bg: "#6e6e8822" };
  const nivelOrder = { especialista: 0, senior: 1, pleno: 2, junior: 3 };

  const inp  = { padding:"8px 14px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"13px",fontFamily:"inherit",cursor:"pointer",outline:"none" };

  const totalConsultores = resultados ? new Set(
    Object.values(resultados).flatMap(mods => Object.values(mods).flatMap(m => m.consultores.map(c => c.nome)))
  ).size : 0;
  const totalModulos = resultados ? Object.values(resultados).reduce((s, mods) => s + Object.keys(mods).length, 0) : 0;

  return (
    <div>
      {/* Header + toggle modo */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"24px",flexWrap:"wrap",gap:"12px" }}>
        <div>
          <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:900,color:"#f0f0fa",margin:"0 0 4px",letterSpacing:"-0.3px" }}>
            🎓 Grade de Conhecimento — Consultores
          </h2>
          <p style={{ fontSize:"12px",color:"#3e3e55",margin:0 }}>Visualize a grade individual ou pesquise por produto/módulo</p>
        </div>
        <div style={{ display:"flex",gap:"2px",background:"#0d0d14",borderRadius:"10px",padding:"3px",border:"1px solid #2a2a3a" }}>
          <button onClick={()=>setModo("consultor")} style={{ padding:"7px 16px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"12px",fontFamily:"inherit",background:modo==="consultor"?"#6c63ff":"transparent",color:modo==="consultor"?"#fff":"#6e6e88" }}>
            👤 Por consultor
          </button>
          <button onClick={()=>setModo("busca")} style={{ padding:"7px 16px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"12px",fontFamily:"inherit",background:modo==="busca"?"#6c63ff":"transparent",color:modo==="busca"?"#fff":"#6e6e88" }}>
            🔍 Buscar por produto/módulo
          </button>
        </div>
      </div>

      {/* MODO: Por consultor */}
      {modo==="consultor" && (
        <div>
          <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px",flexWrap:"wrap" }}>
            <span style={{ fontSize:"12px",color:"#6e6e88",fontWeight:600 }}>Visualizar grade de:</span>
            <select value={gradeConsultor} onChange={e=>setGradeConsultor(e.target.value)} style={inp}>
              {consultores.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <GradeConhecimento consultorName={gradeConsultor} userId={null} readOnly={true}/>
        </div>
      )}

      {/* MODO: Busca por produto/módulo */}
      {modo==="busca" && (
        <div>
          {/* Filtros */}
          <div style={{ background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e",padding:"20px",marginBottom:"20px" }}>
            <div style={{ fontSize:"11px",color:"#3e3e55",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"14px" }}>Filtros de busca</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:"12px",alignItems:"end",flexWrap:"wrap" }}>
              {/* Produto */}
              <div>
                <label style={{ fontSize:"11px",color:"#6e6e88",fontWeight:600,display:"block",marginBottom:"6px",letterSpacing:"0.3px" }}>Produto TOTVS</label>
                <select value={filtroProduto} onChange={e=>{ setFiltroProduto(e.target.value); setFiltroModulo(""); setResultados(null); }} style={{...inp, width:"100%"}}>
                  <option value="">Todos os produtos</option>
                  {TOTVS_PRODUTOS.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {/* Módulo */}
              <div>
                <label style={{ fontSize:"11px",color:"#6e6e88",fontWeight:600,display:"block",marginBottom:"6px",letterSpacing:"0.3px" }}>Módulo específico</label>
                <select value={filtroModulo} onChange={e=>{ setFiltroModulo(e.target.value); setResultados(null); }} style={{...inp, width:"100%"}}>
                  <option value="">Todos os módulos</option>
                  {modulosDoProduto.map(m=>(
                    <option key={m.id} value={m.id}>{m.produto !== filtroProduto && !filtroProduto ? `[${m.produto}] ` : ""}{m.label} — {m.desc}</option>
                  ))}
                </select>
              </div>
              {/* Botão buscar */}
              <button onClick={handleBuscar} disabled={buscando}
                style={{ padding:"9px 24px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",fontWeight:700,fontSize:"13px",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44",whiteSpace:"nowrap",height:"38px" }}>
                {buscando?"⏳ Buscando...":"🔍 Buscar"}
              </button>
            </div>
          </div>

          {/* Resultados */}
          {buscando && (
            <div style={{ textAlign:"center",padding:"48px",color:"#3e3e55" }}>
              <div style={{ width:"32px",height:"32px",border:"3px solid #1f1f2e",borderTop:"3px solid #6c63ff",borderRadius:"50%",animation:"spin .7s linear infinite",margin:"0 auto 14px" }}/>
              <div style={{ fontSize:"13px" }}>Carregando grades de todos os consultores...</div>
            </div>
          )}

          {!buscando && resultados !== null && totalModulos === 0 && (
            <div style={{ textAlign:"center",padding:"48px",background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e" }}>
              <div style={{ fontSize:"36px",marginBottom:"12px" }}>🔍</div>
              <div style={{ fontSize:"14px",color:"#3e3e55" }}>Nenhum consultor cadastrou conhecimento neste produto/módulo ainda.</div>
            </div>
          )}

          {!buscando && resultados !== null && totalModulos > 0 && (
            <div>
              {/* Resumo */}
              <div style={{ display:"flex",gap:"16px",marginBottom:"16px",flexWrap:"wrap" }}>
                <div style={{ padding:"8px 16px",borderRadius:"10px",background:"#6c63ff18",border:"1px solid #6c63ff33",display:"flex",alignItems:"center",gap:"8px" }}>
                  <span style={{ fontSize:"18px" }}>👥</span>
                  <div>
                    <div style={{ fontSize:"18px",fontWeight:800,color:"#a78bfa" }}>{totalConsultores}</div>
                    <div style={{ fontSize:"10px",color:"#6e6e88" }}>consultor{totalConsultores!==1?"es":""}</div>
                  </div>
                </div>
                <div style={{ padding:"8px 16px",borderRadius:"10px",background:"#22d3a018",border:"1px solid #22d3a033",display:"flex",alignItems:"center",gap:"8px" }}>
                  <span style={{ fontSize:"18px" }}>📋</span>
                  <div>
                    <div style={{ fontSize:"18px",fontWeight:800,color:"#22d3a0" }}>{totalModulos}</div>
                    <div style={{ fontSize:"10px",color:"#6e6e88" }}>módulo{totalModulos!==1?"s":""} encontrado{totalModulos!==1?"s":""}</div>
                  </div>
                </div>
              </div>

              {/* Por produto */}
              {Object.entries(resultados).map(([produto, mods])=>(
                <div key={produto} style={{ marginBottom:"20px" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px" }}>
                    <div style={{ padding:"4px 12px",borderRadius:"99px",background:"#6c63ff22",border:"1px solid #6c63ff44" }}>
                      <span style={{ fontSize:"12px",fontWeight:700,color:"#a78bfa" }}>{produto}</span>
                    </div>
                    <span style={{ fontSize:"11px",color:"#3e3e55" }}>{Object.keys(mods).length} módulo{Object.keys(mods).length!==1?"s":""}</span>
                  </div>

                  <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
                    {Object.entries(mods).map(([modId, info])=>{
                      const sorted = [...info.consultores].sort((a,b) => (nivelOrder[a.nivel]??9)-(nivelOrder[b.nivel]??9));
                      return (
                        <div key={modId} style={{ background:"#111118",borderRadius:"12px",border:"1px solid #1f1f2e",padding:"14px 16px" }}>
                          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"12px",flexWrap:"wrap" }}>
                            <div>
                              <div style={{ fontSize:"13px",fontWeight:700,color:"#f0f0fa" }}>{info.label}</div>
                              <div style={{ fontSize:"11px",color:"#3e3e55",marginTop:"2px" }}>{info.desc}</div>
                            </div>
                            <div style={{ display:"flex",gap:"6px",flexWrap:"wrap",justifyContent:"flex-end" }}>
                              {sorted.map(({nome,nivel})=>{
                                const nv = nivelInfo(nivel);
                                return (
                                  <div key={nome}
                                    onClick={()=>setConsultorDisp(consultorDisp===nome?null:nome)}
                                    title="Clique para ver disponibilidade"
                                    style={{ display:"flex",alignItems:"center",gap:"6px",padding:"5px 10px",borderRadius:"8px",background:consultorDisp===nome?"#6c63ff33":nv.bg,border:"1px solid "+(consultorDisp===nome?"#6c63ff":nv.color+"44"),cursor:"pointer",transition:"all .15s" }}>
                                    <div style={{ width:"20px",height:"20px",borderRadius:"6px",background:`hsl(${(consultores.indexOf(nome)*37)%360},55%,48%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",fontWeight:800,color:"#fff",flexShrink:0 }}>
                                      {nome.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                                    </div>
                                    <span style={{ fontSize:"11px",fontWeight:600,color:"#c8c8d8" }}>{nome.split(" ")[0]}</span>
                                    <span style={{ fontSize:"10px",fontWeight:700,color:nv.color,padding:"1px 6px",borderRadius:"99px",background:nv.bg }}>{nv.label}</span>
                                    <span style={{ fontSize:"9px",color:"#454560" }}>📅</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {resultados === null && !buscando && (
            <div style={{ textAlign:"center",padding:"48px",background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e" }}>
              <div style={{ fontSize:"36px",marginBottom:"12px" }}>🎯</div>
              <div style={{ fontSize:"14px",color:"#3e3e55" }}>Selecione os filtros e clique em <strong style={{ color:"#a78bfa" }}>Buscar</strong> para ver quais consultores possuem o conhecimento</div>
            </div>
          )}

          {/* Painel de disponibilidade do consultor selecionado */}
          {consultorDisp && scheduleData && (() => {
            const entradas = scheduleData[consultorDisp] || [];
            const hoje = new Date();
            const mesAtualIdx = hoje.getMonth();   // 0-11
            const anoAtual    = hoje.getFullYear();

            // ── Gerar janela de 6 meses a partir do mês atual ──
            const janela = []; // [{mesIdx, ano, mesNome, label}]
            for (let i = 0; i < 6; i++) {
              const totalMes = mesAtualIdx + i;
              const ano      = anoAtual + Math.floor(totalMes / 12);
              const mIdx     = totalMes % 12;
              const mesNome  = MONTHS_ORDER[mIdx];
              const label    = ano !== anoAtual ? `${mesNome}/${ano}` : mesNome;
              janela.push({ mIdx, ano, mesNome, label });
            }

            // ── Agrupar entradas por (mesNome+ano) ──
            const porChave = {}; // "Março2026": { cliente, ferias, afastamento, reservado, total }
            entradas.forEach(e => {
              const eAno = e.year || anoAtual;
              const chave = (e.month||"") + eAno;
              if (!porChave[chave]) porChave[chave] = { cliente:0, ferias:0, afastamento:0, reservado:0, total:0 };
              porChave[chave].total++;
              if (e.type==="client")   porChave[chave].cliente++;
              else if (e.type==="vacation") porChave[chave].ferias++;
              else if (e.type==="absence")  porChave[chave].afastamento++;
              else if (e.type==="reserved") porChave[chave].reservado++;
            });

            // ── Próximos dias livres no mês atual ──
            const chaveAtual = MONTHS_ORDER[mesAtualIdx] + anoAtual;
            const diasOcupados = new Set(
              entradas
                .filter(e => (e.month||"").toUpperCase() === MONTHS_ORDER[mesAtualIdx].toUpperCase()
                          && (e.year || anoAtual) === anoAtual)
                .map(e => e.day)
            );
            const proxDisponiveis = [];
            let dd = new Date(hoje); dd.setDate(dd.getDate()+1);
            while (proxDisponiveis.length < 5 && dd.getMonth() === mesAtualIdx) {
              const dow = dd.getDay();
              if (dow > 0 && dow < 6 && !diasOcupados.has(dd.getDate())) {
                proxDisponiveis.push(dd.getDate());
              }
              dd.setDate(dd.getDate()+1);
            }

            return (
              <div style={{ marginTop:"20px", background:"#0d0d14", borderRadius:"14px", border:"1px solid #6c63ff33", padding:"20px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px", flexWrap:"wrap", gap:"10px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:`hsl(${(consultores.indexOf(consultorDisp)*37)%360},55%,48%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:800, color:"#fff" }}>
                      {consultorDisp.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:"14px", fontWeight:700, color:"#f0f0fa" }}>📅 Disponibilidade — {consultorDisp}</div>
                      <div style={{ fontSize:"11px", color:"#6e6e88" }}>Próximos 6 meses a partir de {MONTHS_ORDER[mesAtualIdx]}/{anoAtual}</div>
                    </div>
                  </div>
                  <button onClick={()=>setConsultorDisp(null)} style={{ background:"none", border:"none", color:"#6e6e88", cursor:"pointer", fontSize:"18px", lineHeight:1 }}>✕</button>
                </div>

                {/* Próximos dias livres */}
                {proxDisponiveis.length > 0 && (
                  <div style={{ marginBottom:"16px" }}>
                    <div style={{ fontSize:"11px", color:"#22d3a0", fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:"8px" }}>
                      ✅ Próximos dias livres em {MONTHS_ORDER[mesAtualIdx]}
                    </div>
                    <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                      {proxDisponiveis.map(dia => (
                        <span key={dia} style={{ padding:"5px 14px", borderRadius:"8px", background:"#22d3a018", border:"1px solid #22d3a044", fontSize:"12px", fontWeight:700, color:"#22d3a0" }}>
                          Dia {dia}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {proxDisponiveis.length === 0 && (
                  <div style={{ padding:"10px 14px", borderRadius:"10px", background:"#f04f5e18", border:"1px solid #f04f5e33", fontSize:"12px", color:"#f04f5e", marginBottom:"16px" }}>
                    ⚠️ Sem dias livres identificados para o restante do mês atual
                  </div>
                )}

                {/* Resumo por mês — janela de 6 meses */}
                <div style={{ fontSize:"11px", color:"#6e6e88", fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:"10px" }}>Resumo por mês</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"8px" }}>
                  {janela.map(({ mIdx, ano, mesNome, label }) => {
                    const chave = mesNome + ano;
                    const d = porChave[chave];
                    const isAtual = mIdx === mesAtualIdx && ano === anoAtual;
                    const isOutroAno = ano !== anoAtual;
                    const podeAbrir = !!onAbrirAgenda;
                    return (
                      <div key={chave}
                        onClick={() => podeAbrir && onAbrirAgenda(consultorDisp, mesNome)}
                        title={podeAbrir ? `Abrir agenda de ${consultorDisp} em ${label}` : undefined}
                        style={{ background: isAtual?"#6c63ff18":"#111118", borderRadius:"10px", border:"1px solid "+(isAtual?"#6c63ff44":"#1f1f2e"), padding:"10px 12px", cursor: podeAbrir?"pointer":"default", transition:"all .15s" }}
                        onMouseEnter={e=>{ if(podeAbrir) e.currentTarget.style.borderColor="#6c63ff88"; }}
                        onMouseLeave={e=>{ if(podeAbrir) e.currentTarget.style.borderColor=isAtual?"#6c63ff44":"#1f1f2e"; }}
                      >
                        <div style={{ fontSize:"12px", fontWeight:700, color: isAtual?"#a78bfa": isOutroAno?"#60a5fa":"#c8c8d8", marginBottom:"6px", display:"flex", alignItems:"center", gap:"5px" }}>
                          {label}
                          {isAtual && <span style={{ fontSize:"9px", background:"#6c63ff44", borderRadius:"4px", padding:"1px 4px" }}>atual</span>}
                          {isOutroAno && !isAtual && <span style={{ fontSize:"9px", background:"#60a5fa22", borderRadius:"4px", padding:"1px 4px", color:"#60a5fa" }}>{ano}</span>}
                          {podeAbrir && <span style={{ marginLeft:"auto", fontSize:"9px", color:"#3e3e55" }}>📋 abrir</span>}
                        </div>
                        {d ? (
                          <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
                            {d.cliente>0    && <div style={{ fontSize:"10px", color:"#6e6e88" }}>🏢 {d.cliente} dia{d.cliente!==1?"s":""} c/ cliente</div>}
                            {d.ferias>0     && <div style={{ fontSize:"10px", color:"#f5a623" }}>🏖️ {d.ferias} dia{d.ferias!==1?"s":""} de férias</div>}
                            {d.afastamento>0 && <div style={{ fontSize:"10px", color:"#f04f5e" }}>🏥 {d.afastamento} dia{d.afastamento!==1?"s":""} afastado</div>}
                            {d.reservado>0  && <div style={{ fontSize:"10px", color:"#a78bfa" }}>📌 {d.reservado} reservado{d.reservado!==1?"s":""}</div>}
                          </div>
                        ) : (
                          <div style={{ fontSize:"10px", color:"#22d3a0" }}>✅ Sem lançamentos</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADE DE CONHECIMENTO TOTVS (componente do consultor)
// ─────────────────────────────────────────────────────────────────────────────

const TOTVS_PRODUTOS = ["Protheus","RM","Datasul","Fluig","Desenvolvedor"];

const TOTVS_GRUPOS = {
  Protheus: {
    // Backoffice / Administrativo
    "SIGAATF":"Backoffice / Administrativo", "SIGACOM":"Backoffice / Administrativo",
    "SIGAEST":"Backoffice / Administrativo", "SIGAFAT":"Backoffice / Administrativo",
    "SIGAFIN":"Backoffice / Administrativo", "SIGACTB":"Backoffice / Administrativo",
    "SIGAFIS":"Backoffice / Administrativo", "SIGAPCO":"Backoffice / Administrativo",
    // Comercial / Vendas
    "SIGAOMS":"Comercial / Vendas", "SIGATMK":"Comercial / Vendas",
    "SIGALOJA":"Comercial / Vendas","SIGAFRT":"Comercial / Vendas",
    "SIGACTR":"Comercial / Vendas",
    // Logística
    "SIGAWMS":"Logística", "SIGATMS":"Logística",
    // Manufatura / Produção
    "SIGAPCP":"Manufatura / Produção", "SIGAMNT":"Manufatura / Produção",
    "SIGAOFI":"Manufatura / Produção", "SIGACFG":"Manufatura / Produção",
    "SIGAMES":"Manufatura / Produção",
    // Qualidade
    "SIGAQIE":"Qualidade", "SIGAQIP":"Qualidade", "SIGAQMT":"Qualidade",
    "SIGAQNC":"Qualidade", "SIGAQAD":"Qualidade", "SIGAQCP":"Qualidade",
    "SIGAQDO":"Qualidade",
    // Recursos Humanos
    "SIGAGPE":"Recursos Humanos", "SIGAPON":"Recursos Humanos",
    "SIGARSP":"Recursos Humanos", "SIGATRM":"Recursos Humanos",
    "SIGACSA":"Recursos Humanos", "SIGAPLS":"Recursos Humanos",
    "SIGATCF":"Recursos Humanos",
    // Serviços e Projetos
    "SIGATEC":"Serviços e Projetos", "SIGAPMS":"Serviços e Projetos",
    "SIGAENG":"Serviços e Projetos",
    // Comércio Exterior
    "SIGAEIC":"Comércio Exterior", "SIGAEXP":"Comércio Exterior",
    // Outros
    "SIGAVEI":"Outros módulos específicos", "SIGAFRO":"Outros módulos específicos",
    "SIGAAGR":"Outros módulos específicos", "SIGASAU":"Outros módulos específicos",
    "SIGALOG":"Outros módulos específicos",
  },
  RM: {
    // Backoffice / Administrativo & Controladoria
    "RM_NUC": "Backoffice / Administrativo & Controladoria",
    "RM_FLX": "Backoffice / Administrativo & Controladoria",
    "RM_SAL": "Backoffice / Administrativo & Controladoria",
    "RM_LIB": "Backoffice / Administrativo & Controladoria",
    "RM_BON": "Backoffice / Administrativo & Controladoria",
    "RM_FAC": "Backoffice / Administrativo & Controladoria",
    "RM_OFC": "Backoffice / Administrativo & Controladoria",
    "RM_SOL": "Backoffice / Administrativo & Controladoria",
    // Comercial / Relacionamento
    "RM_AGL": "Comercial / Relacionamento",
    "RM_POR": "Comercial / Relacionamento",
    // Recursos Humanos
    "RM_LAB": "Recursos Humanos",
    "RM_VIT": "Recursos Humanos",
    "RM_CHR": "Recursos Humanos",
    "RM_TES": "Recursos Humanos",
    "RM_TRN": "Recursos Humanos",
    // Educacional
    "RM_CLS": "Educacional",
    "RM_BIB": "Educacional",
    // Saúde
    "RM_SAU": "Saúde (vertical)",
    "RM_PLA": "Saúde (vertical)",
    // Verticais / Especializados
    "RM_SGI": "Verticais / Especializados",
    // Business Intelligence & Portais
    "RM_BIS": "Business Intelligence & Portais",
    "RM_POR2":"Business Intelligence & Portais",
    // Infraestrutura / Plataforma
    "RM_REP": "Infraestrutura / Plataforma",
    "RM_FWK": "Infraestrutura / Plataforma",
    "RM_EAI": "Infraestrutura / Plataforma",
  },
  Datasul: {
    // Financeiro
    "DS_APB":  "Financeiro", "DS_ACR":  "Financeiro", "DS_CMG":  "Financeiro",
    "DS_CFL":  "Financeiro", "DS_APL":  "Financeiro", "DS_COB":  "Financeiro", "DS_TES":  "Financeiro",
    // Controladoria / Contabilidade
    "DS_FGL":  "Controladoria / Contabilidade", "DS_MGL":  "Controladoria / Contabilidade",
    "DS_MCT":  "Controladoria / Contabilidade", "DS_ASC":  "Controladoria / Contabilidade",
    "DS_BUC":  "Controladoria / Contabilidade", "DS_FAS":  "Controladoria / Contabilidade",
    "DS_ORC":  "Controladoria / Contabilidade",
    // Fiscal / Tributário
    "DS_OBF":  "Fiscal / Tributário", "DS_CFG":  "Fiscal / Tributário",
    "DS_RECI": "Fiscal / Tributário", "DS_TAX":  "Fiscal / Tributário",
    // Logística / Suprimentos
    "DS_COM":  "Logística / Suprimentos", "DS_EST":  "Logística / Suprimentos",
    "DS_RECV": "Logística / Suprimentos", "DS_AVF":  "Logística / Suprimentos",
    "DS_COT":  "Logística / Suprimentos", "DS_CTR":  "Logística / Suprimentos",
    // Faturamento / Comercial
    "DS_FAT":  "Faturamento / Comercial", "DS_PED":  "Faturamento / Comercial",
    "DS_EMB":  "Faturamento / Comercial", "DS_CRM":  "Faturamento / Comercial",
    // Comércio Exterior
    "DS_IMP":  "Comércio Exterior", "DS_EXP":  "Comércio Exterior",
    "DS_DRB":  "Comércio Exterior", "DS_CAM":  "Comércio Exterior",
    // Manufatura / Produção
    "DS_ENG":  "Manufatura / Produção", "DS_MRP":  "Manufatura / Produção",
    "DS_APS":  "Manufatura / Produção", "DS_CPR":  "Manufatura / Produção",
    "DS_CFB":  "Manufatura / Produção", "DS_CDP":  "Manufatura / Produção",
    "DS_CST":  "Manufatura / Produção", "DS_QUAL": "Manufatura / Produção",
    "DS_MET":  "Manufatura / Produção", "DS_MES":  "Manufatura / Produção",
    "DS_CFGP": "Manufatura / Produção", "DS_DPR":  "Manufatura / Produção",
    "DS_MAN":  "Manufatura / Produção",
    // Recursos Humanos
    "DS_HCM":  "Recursos Humanos", "DS_FOP":  "Recursos Humanos",
    "DS_ORG":  "Recursos Humanos", "DS_PJT":  "Recursos Humanos",
    // Verticais — Agronegócio
    "DS_GRA":  "Verticais — Agronegócio",
    // Verticais — Frotas
    "DS_FRO":  "Verticais — Frotas",
    // Verticais — Saúde
    "DS_HOSP": "Verticais — Saúde", "DS_BENE": "Verticais — Saúde", "DS_CMED": "Verticais — Saúde",
    // Ferramentas / Plataforma
    "DS_TEC":  "Ferramentas / Plataforma", "DS_EAI":  "Ferramentas / Plataforma",
    "DS_BI":   "Ferramentas / Plataforma", "DS_SMA":  "Ferramentas / Plataforma",
  },
  Fluig: {
    // ECM
    "FL_ECM_DOC":  "ECM – Gestão de Documentos", "FL_ECM_VER":  "ECM – Gestão de Documentos",
    "FL_ECM_PER":  "ECM – Gestão de Documentos", "FL_ECM_DIG":  "ECM – Gestão de Documentos",
    "FL_ECM_ASS":  "ECM – Gestão de Documentos", "FL_ECM_META": "ECM – Gestão de Documentos",
    // BPM
    "FL_BPM_MOD":  "BPM – Gestão de Processos",  "FL_BPM_WFL":  "BPM – Gestão de Processos",
    "FL_BPM_FORM": "BPM – Gestão de Processos",  "FL_BPM_SLA":  "BPM – Gestão de Processos",
    "FL_BPM_AUTO": "BPM – Gestão de Processos",
    // WCM
    "FL_WCM_PORT": "WCM – Portais e Intranet",   "FL_WCM_INT":  "WCM – Portais e Intranet",
    "FL_WCM_WID":  "WCM – Portais e Intranet",   "FL_WCM_COLAB":"WCM – Portais e Intranet",
    "FL_WCM_FORN": "WCM – Portais e Intranet",
    // Social
    "FL_SOC_FEED": "Social / Colaboração",        "FL_SOC_COM":  "Social / Colaboração",
    "FL_SOC_COLAB":"Social / Colaboração",
    // Integração
    "FL_INT_API":  "Integração",                  "FL_INT_ERP":  "Integração",
    "FL_INT_SYNC": "Integração",
    // Identity
    "FL_IDN_USR":  "Identity / Segurança",        "FL_IDN_SSO":  "Identity / Segurança",
    "FL_IDN_AUD":  "Identity / Segurança",
  },
  Desenvolvedor: {
    // Linguagem de Programação
    "DEV_ADVPL":     "Linguagem de Programação",  "DEV_TLPP":       "Linguagem de Programação",
    "DEV_OOP":       "Linguagem de Programação",
    // Arquitetura do ERP
    "DEV_TABELAS":   "Arquitetura do ERP",         "DEV_CAMPOS_CT":  "Arquitetura do ERP",
    "DEV_INDICES":   "Arquitetura do ERP",         "DEV_DICIONARIO": "Arquitetura do ERP",
    "DEV_PE":        "Arquitetura do ERP",         "DEV_PADROES":    "Arquitetura do ERP",
    // Banco de Dados
    "DEV_SQLSERVER": "Banco de Dados",             "DEV_ORACLE":     "Banco de Dados",
    "DEV_POSTGRES":  "Banco de Dados",             "DEV_SQL":        "Banco de Dados",
    "DEV_SQL_ADV":   "Banco de Dados",
    // Ferramentas TOTVS
    "DEV_TDS":       "Ferramentas TOTVS",          "DEV_SMARTCLIENT":"Ferramentas TOTVS",
    "DEV_APPSERVER": "Ferramentas TOTVS",
    // Integrações
    "DEV_JSON":      "Integrações",                "DEV_XML":        "Integrações",
    "DEV_REST":      "Integrações",                "DEV_SOAP":       "Integrações",
    // Frameworks e Recursos
    "DEV_MVC":       "Frameworks e Recursos",      "DEV_FWBROWSE":   "Frameworks e Recursos",
    "DEV_FWFORM":    "Frameworks e Recursos",      "DEV_REST_FW":    "Frameworks e Recursos",
    "DEV_JOBS":      "Frameworks e Recursos",
    // Conhecimento Funcional
    "DEV_FUN_FIN":   "Conhecimento Funcional",     "DEV_FUN_FAT":    "Conhecimento Funcional",
    "DEV_FUN_COM":   "Conhecimento Funcional",     "DEV_FUN_EST":    "Conhecimento Funcional",
    "DEV_FUN_CTB":   "Conhecimento Funcional",     "DEV_FUN_FIS":    "Conhecimento Funcional",
    "DEV_FUN_RH":    "Conhecimento Funcional",
    // Versionamento de Código
    "DEV_GIT":       "Versionamento de Código",    "DEV_GITLAB":     "Versionamento de Código",
    // Performance e Arquitetura
    "DEV_TUNING_SQL":"Performance e Arquitetura",  "DEV_TUNING_ADV": "Performance e Arquitetura",
    "DEV_DEPLOY":    "Performance e Arquitetura",  "DEV_AMBIENTES":  "Performance e Arquitetura",
  }
};

const TOTVS_MODULOS = {
  Protheus: [
    // Backoffice / Administrativo
    { id:"SIGAATF",  label:"SIGAATF",  desc:"Ativo Fixo — controle de imobilizado" },
    { id:"SIGACOM",  label:"SIGACOM",  desc:"Compras — gestão de compras" },
    { id:"SIGAEST",  label:"SIGAEST",  desc:"Estoque e Custos — controle de estoque" },
    { id:"SIGAFAT",  label:"SIGAFAT",  desc:"Faturamento — emissão de notas e faturamento" },
    { id:"SIGAFIN",  label:"SIGAFIN",  desc:"Financeiro — contas a pagar/receber" },
    { id:"SIGACTB",  label:"SIGACTB",  desc:"Contabilidade — contabilidade geral" },
    { id:"SIGAFIS",  label:"SIGAFIS",  desc:"Livros Fiscais — escrituração fiscal" },
    { id:"SIGAPCO",  label:"SIGAPCO",  desc:"Planejamento e Controle Orçamentário" },
    // Comercial / Vendas
    { id:"SIGAOMS",  label:"SIGAOMS",  desc:"Order Management System — gestão de pedidos" },
    { id:"SIGATMK",  label:"SIGATMK",  desc:"Telemarketing — televendas e telecobrança" },
    { id:"SIGALOJA", label:"SIGALOJA", desc:"Loja / PDV — operação de lojas" },
    { id:"SIGAFRT",  label:"SIGAFRT",  desc:"Front Loja — frente de caixa" },
    { id:"SIGACTR",  label:"SIGACTR",  desc:"Contratos — gestão de contratos" },
    // Logística
    { id:"SIGAWMS",  label:"SIGAWMS",  desc:"Warehouse Management System — gestão de armazém" },
    { id:"SIGATMS",  label:"SIGATMS",  desc:"Transportation Management — gestão de transporte" },
    // Manufatura / Produção
    { id:"SIGAPCP",  label:"SIGAPCP",  desc:"PCP — Planejamento e Controle de Produção" },
    { id:"SIGAMNT",  label:"SIGAMNT",  desc:"Manutenção — manutenção de ativos" },
    { id:"SIGAOFI",  label:"SIGAOFI",  desc:"Oficina — gestão de oficina" },
    { id:"SIGACFG",  label:"SIGACFG",  desc:"Configurador de produtos" },
    { id:"SIGAMES",  label:"SIGAMES",  desc:"Manufacturing Execution System" },
    // Qualidade
    { id:"SIGAQIE",  label:"SIGAQIE",  desc:"Inspeção de Entradas" },
    { id:"SIGAQIP",  label:"SIGAQIP",  desc:"Inspeção de Processos" },
    { id:"SIGAQMT",  label:"SIGAQMT",  desc:"Metrologia" },
    { id:"SIGAQNC",  label:"SIGAQNC",  desc:"Não conformidades" },
    { id:"SIGAQAD",  label:"SIGAQAD",  desc:"Auditoria" },
    { id:"SIGAQCP",  label:"SIGAQCP",  desc:"Controle estatístico de processo" },
    { id:"SIGAQDO",  label:"SIGAQDO",  desc:"Controle de documentos" },
    // Recursos Humanos
    { id:"SIGAGPE",  label:"SIGAGPE",  desc:"Gestão de Pessoal — folha de pagamento" },
    { id:"SIGAPON",  label:"SIGAPON",  desc:"Ponto Eletrônico" },
    { id:"SIGARSP",  label:"SIGARSP",  desc:"Recrutamento e Seleção" },
    { id:"SIGATRM",  label:"SIGATRM",  desc:"Treinamento" },
    { id:"SIGACSA",  label:"SIGACSA",  desc:"Cargos e salários" },
    { id:"SIGAPLS",  label:"SIGAPLS",  desc:"Plano de saúde" },
    { id:"SIGATCF",  label:"SIGATCF",  desc:"RH Online" },
    // Serviços e Projetos
    { id:"SIGATEC",  label:"SIGATEC",  desc:"Field Service" },
    { id:"SIGAPMS",  label:"SIGAPMS",  desc:"Gestão de Projetos" },
    { id:"SIGAENG",  label:"SIGAENG",  desc:"Engenharia" },
    // Comércio Exterior
    { id:"SIGAEIC",  label:"SIGAEIC",  desc:"Easy Import Control" },
    { id:"SIGAEXP",  label:"SIGAEXP",  desc:"Exportação" },
    // Outros módulos específicos
    { id:"SIGAVEI",  label:"SIGAVEI",  desc:"Gestão de veículos" },
    { id:"SIGAFRO",  label:"SIGAFRO",  desc:"Gestão de frotas" },
    { id:"SIGAAGR",  label:"SIGAAGR",  desc:"Agronegócio" },
    { id:"SIGASAU",  label:"SIGASAU",  desc:"Saúde" },
    { id:"SIGALOG",  label:"SIGALOG",  desc:"Logística avançada" },
  ],
  RM: [
    // Backoffice / Administrativo & Controladoria
    { id:"RM_NUC",  label:"RM Nucleus",   desc:"Estoque, compras, faturamento e contratos" },
    { id:"RM_FLX",  label:"RM Fluxus",    desc:"Gestão financeira, caixa e bancos" },
    { id:"RM_SAL",  label:"RM Saldus",    desc:"Contabilidade gerencial e fiscal" },
    { id:"RM_LIB",  label:"RM Liber",     desc:"Gestão fiscal / tributária e obrigações" },
    { id:"RM_BON",  label:"RM Bonum",     desc:"Ativo imobilizado / patrimônio" },
    { id:"RM_FAC",  label:"RM Factor",    desc:"Planejamento e Controle da Produção (PCP)" },
    { id:"RM_OFC",  label:"RM Officina",  desc:"Manutenção industrial / ativos" },
    { id:"RM_SOL",  label:"RM Solum",     desc:"Construção civil, obras e projetos" },
    // Comercial / Relacionamento
    { id:"RM_AGL",  label:"RM Agilis",    desc:"CRM / gestão de relacionamento com clientes" },
    { id:"RM_POR",  label:"RM Portal",    desc:"Portais corporativos (funcionário, cliente, fornecedor)" },
    // Recursos Humanos
    { id:"RM_LAB",  label:"RM Labore",    desc:"Folha de pagamento" },
    { id:"RM_VIT",  label:"RM Vitae",     desc:"Gestão de pessoas / RH" },
    { id:"RM_CHR",  label:"RM Chronus",   desc:"Controle de ponto eletrônico" },
    { id:"RM_TES",  label:"RM Testis",    desc:"Avaliação de desempenho / pesquisas" },
    { id:"RM_TRN",  label:"RM Training",  desc:"Gestão de treinamento e capacitação" },
    // Educacional
    { id:"RM_CLS",  label:"RM Classis",   desc:"Gestão acadêmica (escolas e universidades)" },
    { id:"RM_BIB",  label:"RM Biblios",   desc:"Controle de acervo e empréstimos" },
    // Saúde (vertical)
    { id:"RM_SAU",  label:"RM Saúde",     desc:"Gestão hospitalar" },
    { id:"RM_PLA",  label:"RM Planos",    desc:"Operadoras de saúde" },
    // Verticais / Especializados
    { id:"RM_SGI",  label:"RM SGI",       desc:"Gestão de empreendimentos imobiliários" },
    // Business Intelligence & Portais
    { id:"RM_BIS",  label:"RM Bis",       desc:"BI / indicadores e dashboards gerenciais" },
    { id:"RM_POR2", label:"RM Portal (BI)",desc:"Portais web (RH, aluno, fornecedor etc.)" },
    // Infraestrutura / Plataforma
    { id:"RM_REP",  label:"RM Reports",   desc:"Geração de relatórios" },
    { id:"RM_FWK",  label:"RM Portal Framework", desc:"Portais web" },
    { id:"RM_EAI",  label:"RM Integrações / EAI", desc:"Integração com outros sistemas TOTVS e ERPs" },
  ],
  Datasul: [
    // Financeiro
    { id:"DS_APB",  label:"APB",          desc:"Contas a Pagar" },
    { id:"DS_ACR",  label:"ACR",          desc:"Contas a Receber" },
    { id:"DS_CMG",  label:"CMG",          desc:"Caixa e Bancos" },
    { id:"DS_CFL",  label:"CFL",          desc:"Fluxo de Caixa" },
    { id:"DS_APL",  label:"APL",          desc:"Aplicações e Empréstimos" },
    { id:"DS_COB",  label:"COB",          desc:"Cobrança" },
    { id:"DS_TES",  label:"TES",          desc:"Tesouraria" },
    // Controladoria / Contabilidade
    { id:"DS_FGL",  label:"FGL",          desc:"Contabilidade Fiscal" },
    { id:"DS_MGL",  label:"MGL",          desc:"Contabilidade Gerencial" },
    { id:"DS_MCT",  label:"MCT",          desc:"Contabilidade" },
    { id:"DS_ASC",  label:"ASC",          desc:"Cenários Contábeis" },
    { id:"DS_BUC",  label:"BUC",          desc:"Unidade de Negócio" },
    { id:"DS_FAS",  label:"FAS",          desc:"Ativo Fixo" },
    { id:"DS_ORC",  label:"ORC",          desc:"Orçamento" },
    // Fiscal / Tributário
    { id:"DS_OBF",  label:"OBF",          desc:"Obrigações Fiscais" },
    { id:"DS_CFG",  label:"CFG",          desc:"Configurador Fiscal" },
    { id:"DS_RECI", label:"REC",          desc:"Recuperação de Impostos" },
    { id:"DS_TAX",  label:"TAX",          desc:"Configurador de Tributos" },
    // Logística / Suprimentos
    { id:"DS_COM",  label:"COM",          desc:"Compras" },
    { id:"DS_EST",  label:"EST",          desc:"Estoque" },
    { id:"DS_RECV", label:"REC",          desc:"Recebimento" },
    { id:"DS_AVF",  label:"AVF",          desc:"Avaliação de Fornecedores" },
    { id:"DS_COT",  label:"COT",          desc:"Cotações de Compras" },
    { id:"DS_CTR",  label:"CTR",          desc:"Contratos de Compras" },
    // Faturamento / Comercial
    { id:"DS_FAT",  label:"FAT",          desc:"Faturamento" },
    { id:"DS_PED",  label:"PED",          desc:"Pedidos de Venda" },
    { id:"DS_EMB",  label:"EMB",          desc:"Controle de Embarques" },
    { id:"DS_CRM",  label:"CRM",          desc:"Relacionamento com clientes" },
    // Comércio Exterior
    { id:"DS_IMP",  label:"IMP",          desc:"Importação" },
    { id:"DS_EXP",  label:"EXP",          desc:"Exportação" },
    { id:"DS_DRB",  label:"DRB",          desc:"Drawback" },
    { id:"DS_CAM",  label:"CAM",          desc:"Câmbio" },
    // Manufatura / Produção
    { id:"DS_ENG",  label:"ENG",          desc:"Engenharia de Produto" },
    { id:"DS_MRP",  label:"MRP",          desc:"Planejamento de Materiais" },
    { id:"DS_APS",  label:"APS",          desc:"Planejamento Avançado de Produção" },
    { id:"DS_CPR",  label:"CPR",          desc:"Controle de Produção" },
    { id:"DS_CFB",  label:"CFB",          desc:"Chão de Fábrica" },
    { id:"DS_CDP",  label:"CDP",          desc:"Coleta de Dados de Produção" },
    { id:"DS_CST",  label:"CST",          desc:"Custos Industriais" },
    { id:"DS_QUAL", label:"QUAL",         desc:"Controle de Qualidade" },
    { id:"DS_MET",  label:"MET",          desc:"Metrologia" },
    { id:"DS_MES",  label:"MES",          desc:"Manufacturing Execution System" },
    { id:"DS_CFGP", label:"CFG Produtos", desc:"Configurador de Produtos" },
    { id:"DS_DPR",  label:"DPR",          desc:"Desenvolvimento de Produtos" },
    { id:"DS_MAN",  label:"MAN",          desc:"Manutenção Industrial" },
    // Recursos Humanos
    { id:"DS_HCM",  label:"HCM",          desc:"Gestão de Pessoas" },
    { id:"DS_FOP",  label:"FOP",          desc:"Folha de Pagamento" },
    { id:"DS_ORG",  label:"ORG",          desc:"Desenvolvimento Organizacional" },
    { id:"DS_PJT",  label:"PJT",          desc:"Controle de Projetos" },
    // Verticais — Agronegócio
    { id:"DS_GRA",  label:"GRA",          desc:"Gestão de Grãos" },
    // Verticais — Frotas
    { id:"DS_FRO",  label:"FRO",          desc:"Gestão de Frotas" },
    // Verticais — Saúde
    { id:"DS_HOSP", label:"Módulo Hospitalar", desc:"Gestão hospitalar" },
    { id:"DS_BENE", label:"Beneficiários", desc:"Gestão de beneficiários" },
    { id:"DS_CMED", label:"Contas Médicas",desc:"Gestão de contas médicas" },
    // Ferramentas / Plataforma
    { id:"DS_TEC",  label:"TEC",          desc:"Framework Datasul" },
    { id:"DS_EAI",  label:"EAI",          desc:"Integrações" },
    { id:"DS_BI",   label:"BI",           desc:"Business Analytics" },
    { id:"DS_SMA",  label:"SmartView",    desc:"SmartView / Analytics" },
  ],
  Fluig: [
    // ECM – Gestão de Documentos
    { id:"FL_ECM_DOC",  label:"Gestão de Documentos",     desc:"Controle e armazenamento de documentos corporativos" },
    { id:"FL_ECM_VER",  label:"Controle de Versões",      desc:"Versionamento e histórico de documentos" },
    { id:"FL_ECM_PER",  label:"Permissões e Segurança",   desc:"Controle de acesso e segurança de documentos" },
    { id:"FL_ECM_DIG",  label:"Digitalização",            desc:"Digitalização, indexação e busca de documentos" },
    { id:"FL_ECM_ASS",  label:"Assinatura Eletrônica",    desc:"Assinatura e validação eletrônica de documentos" },
    { id:"FL_ECM_META", label:"Metadados e Pastas",       desc:"Organização por pastas, metadados e categorias" },
    // BPM – Gestão de Processos
    { id:"FL_BPM_MOD",  label:"Modelagem de Processos",   desc:"Criação e modelagem de fluxos de trabalho BPMN" },
    { id:"FL_BPM_WFL",  label:"Workflows e Aprovações",   desc:"Automação de aprovações e tarefas sequenciais" },
    { id:"FL_BPM_FORM", label:"Formulários Eletrônicos",  desc:"Criação de formulários digitais para processos" },
    { id:"FL_BPM_SLA",  label:"SLA e Monitoramento",      desc:"Acompanhamento de SLA e indicadores de processos" },
    { id:"FL_BPM_AUTO", label:"Automação de Processos",   desc:"Automação e robotização de fluxos internos" },
    // WCM – Portais e Intranet
    { id:"FL_WCM_PORT", label:"Portais Corporativos",     desc:"Criação e gestão de portais corporativos" },
    { id:"FL_WCM_INT",  label:"Intranet",                 desc:"Intranet e comunicação interna" },
    { id:"FL_WCM_WID",  label:"Widgets e Componentes",    desc:"Páginas personalizadas, widgets e componentes visuais" },
    { id:"FL_WCM_COLAB",label:"Portal do Colaborador",    desc:"Portal do funcionário com autoatendimento" },
    { id:"FL_WCM_FORN", label:"Portal do Fornecedor",     desc:"Portal externo para fornecedores e clientes" },
    // Social / Colaboração
    { id:"FL_SOC_FEED", label:"Feed Corporativo",         desc:"Feed de notícias e comunicação entre equipes" },
    { id:"FL_SOC_COM",  label:"Comunidades",              desc:"Grupos, comunidades e compartilhamento de arquivos" },
    { id:"FL_SOC_COLAB",label:"Colaboração em Equipe",    desc:"Comentários, curtidas e interação interna" },
    // Integração
    { id:"FL_INT_API",  label:"APIs REST",                desc:"Integração via APIs REST com sistemas externos" },
    { id:"FL_INT_ERP",  label:"Integração com ERPs",      desc:"Integração com Protheus, Datasul e RM" },
    { id:"FL_INT_SYNC", label:"Sincronização de Dados",   desc:"Consumo de serviços e sincronização de informações" },
    // Identity / Segurança
    { id:"FL_IDN_USR",  label:"Gestão de Usuários",       desc:"Controle de usuários, grupos e papéis" },
    { id:"FL_IDN_SSO",  label:"Single Sign-On",           desc:"Autenticação centralizada e SSO" },
    { id:"FL_IDN_AUD",  label:"Auditoria de Acessos",     desc:"Logs de auditoria e rastreabilidade de acessos" },
  ],
  Desenvolvedor: [
    // Linguagem de Programação
    { id:"DEV_ADVPL",    label:"AdvPL",                      desc:"Linguagem nativa do Protheus — sintaxe, funções e estrutura" },
    { id:"DEV_TLPP",     label:"TL++ (TLPP)",                desc:"Evolução do AdvPL com suporte a orientação a objetos moderna" },
    { id:"DEV_SINTAX",   label:"Sintaxe da Linguagem",       desc:"Comandos, operadores, estruturas de controle e boas práticas" },
    { id:"DEV_FUNCS",    label:"Funções Padrão",             desc:"Biblioteca de funções nativas do Protheus (Ex: ExecBlock, FunName)" },
    { id:"DEV_ARRAYS",   label:"Manipulação de Arrays",      desc:"Arrays multidimensionais, aAdd, aDel, aScan e ordenação" },
    { id:"DEV_FILES",    label:"Manipulação de Arquivos",    desc:"Leitura e escrita de arquivos TXT, CSV, XML via AdvPL" },
    { id:"DEV_OOP",      label:"Programação Orientada a Objetos", desc:"Classes, métodos, herança e encapsulamento em TL++" },
    // Arquitetura do ERP
    { id:"DEV_TABELAS",  label:"Tabelas do Protheus (SX)",   desc:"Estrutura SX1, SX2, SX3, SX5, SX6, SX7 e SIX — dicionário de dados" },
    { id:"DEV_RECNO",    label:"Campos de Controle (RECNO/RECDEL)", desc:"Uso de R_E_C_N_O_, R_E_C_D_E_L_ e controle de registros" },
    { id:"DEV_INDICES",  label:"Índices e Ordens",           desc:"Criação e uso de índices no SIX, ordens de busca e performance" },
    { id:"DEV_DICIO",    label:"Dicionário de Dados",        desc:"Manutenção via ATUSX, configuração de campos e parâmetros (SX2/SX3)" },
    { id:"DEV_PADROES",  label:"Padrões de Desenvolvimento TOTVS", desc:"Guia de desenvolvimento, nomenclaturas e boas práticas TOTVS" },
    { id:"DEV_PE",       label:"Pontos de Entrada (PE)",     desc:"Customização via pontos de entrada sem alterar fonte padrão" },
    { id:"DEV_ROTINAS",  label:"Rotinas Padrão",             desc:"Entendimento e extensão das rotinas padrão do Protheus" },
    // Banco de Dados
    { id:"DEV_MSSQL",    label:"Microsoft SQL Server",       desc:"Administração, configuração e queries no SQL Server com Protheus" },
    { id:"DEV_ORACLE",   label:"Oracle Database",            desc:"Uso do Oracle como banco de dados do ERP TOTVS" },
    { id:"DEV_PGSQL",    label:"PostgreSQL",                 desc:"Uso do PostgreSQL como banco de dados do ERP TOTVS" },
    { id:"DEV_SQL",      label:"SQL",                        desc:"Linguagem SQL: SELECT, INSERT, UPDATE, DELETE e transações" },
    { id:"DEV_JOINS",    label:"Joins e Subconsultas",       desc:"INNER JOIN, LEFT JOIN, EXISTS, subconsultas e CTEs" },
    { id:"DEV_VIEWS",    label:"Views e Procedures",         desc:"Criação de views, stored procedures e triggers no banco" },
    { id:"DEV_PROCS",    label:"Procedures e Functions",     desc:"Procedures armazenadas, functions e automação no banco de dados" },
    { id:"DEV_PERF_BD",  label:"Performance de Consultas",   desc:"Análise de execution plan, índices e otimização de queries" },
    // Ferramentas TOTVS
    { id:"DEV_TDS",      label:"TOTVS Developer Studio",     desc:"IDE oficial TOTVS para desenvolvimento, compilação e debug em AdvPL/TL++" },
    { id:"DEV_SMARTCLI", label:"TOTVS SmartClient",          desc:"Client do Protheus — configuração e uso para acesso ao ERP" },
    { id:"DEV_APPSRV",   label:"TOTVS AppServer",            desc:"Servidor de aplicação do Protheus — administração e configuração" },
    { id:"DEV_INI",      label:"appserver.ini",              desc:"Configuração do arquivo ini: ambientes, ports, bancos e parâmetros" },
    { id:"DEV_COMPIL",   label:"Compilação e Deploy",        desc:"Processo de compilação RPO, patch e atualização de fontes" },
    { id:"DEV_LOGS",     label:"Análise de Logs",            desc:"Leitura e diagnóstico de logs do AppServer e Console" },
    // Integrações
    { id:"DEV_JSON",     label:"JSON",                       desc:"Criação e consumo de JSON em AdvPL/TL++ e integrações" },
    { id:"DEV_XML",      label:"XML",                        desc:"Leitura e geração de XML — NF-e, NFS-e e integrações" },
    { id:"DEV_REST",     label:"REST API",                   desc:"Consumo e criação de APIs REST no Protheus" },
    { id:"DEV_SOAP",     label:"SOAP / Web Services",        desc:"Integração via SOAP, WSDL e Web Services padrão" },
    { id:"DEV_WS",       label:"Webservices do Protheus",    desc:"Uso dos webservices nativos do Protheus para integração entre módulos" },
    // Frameworks e Recursos
    { id:"DEV_MVC",      label:"MVC do Protheus",            desc:"Padrão Model-View-Controller nativo do Protheus para telas e relatórios" },
    { id:"DEV_FWBROW",   label:"FWBrowse",                   desc:"Componente de browse avançado do framework TOTVS" },
    { id:"DEV_FWFORM",   label:"FWFormModel",                desc:"Model do formulário MVC — validações, relacionamentos e campos" },
    { id:"DEV_FWVIEW",   label:"FWFormView",                 desc:"View do formulário MVC — interface visual e layout de telas" },
    { id:"DEV_RESTPROT", label:"REST do Protheus",           desc:"Framework REST nativo do Protheus para exposição de APIs" },
    { id:"DEV_JOBS",     label:"Jobs",                       desc:"Processos em background (Jobs) — execução assíncrona no AppServer" },
    { id:"DEV_SCHED",    label:"Schedule",                   desc:"Agendamento de tarefas automáticas no Protheus" },
    { id:"DEV_WSPROTHEUS",label:"Webservices Nativos",       desc:"Webservices padrão do Protheus expostos para integração" },
    // Conhecimento Funcional
    { id:"DEV_FIN",      label:"Financeiro",                 desc:"Regras de negócio do módulo Financeiro (SIGAFIN) para customização" },
    { id:"DEV_FAT",      label:"Faturamento",                desc:"Regras de negócio do módulo Faturamento (SIGAFAT) para customização" },
    { id:"DEV_COM",      label:"Compras",                    desc:"Regras de negócio do módulo Compras (SIGACOM) para customização" },
    { id:"DEV_EST",      label:"Estoque",                    desc:"Regras de negócio do módulo Estoque (SIGAEST) para customização" },
    { id:"DEV_CTB",      label:"Contabilidade",              desc:"Regras de negócio da Contabilidade (SIGACTB) para customização" },
    { id:"DEV_FIS",      label:"Fiscal",                     desc:"Regras de negócio dos Livros Fiscais (SIGAFIS) para customização" },
    { id:"DEV_RH",       label:"RH / Folha de Pagamento",   desc:"Regras de negócio do RH (SIGAGPE/SIGARH) para customização" },
    // Versionamento de Código
    { id:"DEV_GIT",      label:"Git",                        desc:"Controle de versão com Git — commits, branches, merge e rebase" },
    { id:"DEV_GITLAB",   label:"GitLab",                     desc:"Uso do GitLab: CI/CD, pipelines e gestão de repositórios" },
    { id:"DEV_GITHUB",   label:"GitHub",                     desc:"Uso do GitHub: pull requests, Actions e projetos" },
    // Performance e Arquitetura
    { id:"DEV_TUNSQL",   label:"Tuning SQL",                 desc:"Otimização de consultas SQL — índices, execution plan e reescrita" },
    { id:"DEV_OPTLOOP",  label:"Otimização de Loops AdvPL",  desc:"Técnicas para melhorar performance de loops e processamentos em lote" },
    { id:"DEV_IDXUSE",   label:"Uso Correto de Índices",     desc:"Estratégias de indexação e uso eficiente de ordens no Protheus" },
    { id:"DEV_AMBIENTES",label:"Gestão de Ambientes",        desc:"Configuração e separação de ambientes: dev, homologação e produção" },
    { id:"DEV_DEPLOY",   label:"Deploy e Atualização",       desc:"Processo de deploy de customizações e atualizações no ambiente" },
    { id:"DEV_ATDICIO",  label:"Atualização de Dicionário",  desc:"Aplicação de atualizações de dicionário sem impactar produção" },
  ],

  Desenvolvedor: [
    // 1. Linguagem de Programação
    { id:"DEV_ADVPL",    label:"AdvPL",                    desc:"Linguagem nativa do Protheus — sintaxe, funções padrão, arrays e arquivos" },
    { id:"DEV_TLPP",     label:"TL++ (TLPP)",              desc:"Evolução do AdvPL com suporte a orientação a objetos moderna" },
    { id:"DEV_OOP",      label:"Programação Orientada a Objetos", desc:"Classes, herança, encapsulamento e polimorfismo em AdvPL/TLPP" },

    // 2. Arquitetura do ERP
    { id:"DEV_TABELAS",  label:"Estrutura de Tabelas",     desc:"Tabelas SX1, SX2, SX3 — campos, índices e dicionário de dados" },
    { id:"DEV_CAMPOS_CT",label:"Campos de Controle",       desc:"R_E_C_N_O_, R_E_C_D_E_L_ e controle de integridade de registros" },
    { id:"DEV_INDICES",  label:"Índices e Ordens",         desc:"Criação, uso e otimização de índices no dicionário de dados" },
    { id:"DEV_DICIONARIO",label:"Dicionário de Dados",     desc:"Customização de campos, triggers, validações e parâmetros SX" },
    { id:"DEV_PE",       label:"Pontos de Entrada (PE)",   desc:"Customização de rotinas padrão via pontos de entrada TOTVS" },
    { id:"DEV_PADROES",  label:"Padrões de Desenvolvimento TOTVS", desc:"Nomenclatura, boas práticas e padrões de codificação TOTVS" },

    // 3. Banco de Dados
    { id:"DEV_SQLSERVER",label:"Microsoft SQL Server",     desc:"Administração, tuning e desenvolvimento no SQL Server" },
    { id:"DEV_ORACLE",   label:"Oracle Database",          desc:"Administração, PL/SQL e tuning no Oracle" },
    { id:"DEV_POSTGRES", label:"PostgreSQL",               desc:"Administração, PL/pgSQL e otimização no PostgreSQL" },
    { id:"DEV_SQL",      label:"SQL — Consultas e Joins",  desc:"SELECT, JOIN, subqueries, GROUP BY e operações avançadas" },
    { id:"DEV_SQL_ADV",  label:"SQL Avançado",             desc:"Views, procedures, functions, triggers e performance de consultas" },

    // 4. Ferramentas de Desenvolvimento
    { id:"DEV_TDS",      label:"TOTVS Developer Studio",   desc:"IDE oficial para desenvolvimento, compilação e depuração em AdvPL" },
    { id:"DEV_SMARTCLIENT",label:"TOTVS SmartClient",      desc:"Configuração e uso do cliente de execução do Protheus" },
    { id:"DEV_APPSERVER",label:"TOTVS AppServer",          desc:"Configuração do appserver.ini, ambientes, compilação e logs" },

    // 5. Integrações
    { id:"DEV_JSON",     label:"JSON",                     desc:"Manipulação de JSON em AdvPL/TLPP — parse, geração e validação" },
    { id:"DEV_XML",      label:"XML",                      desc:"Leitura, geração e validação de documentos XML" },
    { id:"DEV_REST",     label:"REST API",                 desc:"Desenvolvimento e consumo de APIs REST no Protheus" },
    { id:"DEV_SOAP",     label:"SOAP / Webservices",       desc:"Criação e consumo de Webservices SOAP no Protheus" },

    // 6. Frameworks do Protheus
    { id:"DEV_MVC",      label:"MVC do Protheus",          desc:"Padrão Model-View-Controller nativo do Protheus" },
    { id:"DEV_FWBROWSE", label:"FWBrowse",                 desc:"Componente de listagem e navegação de registros" },
    { id:"DEV_FWFORM",   label:"FWFormModel / FWFormView", desc:"Modelo e visão de formulários no padrão MVC" },
    { id:"DEV_REST_FW",  label:"REST Framework Protheus",  desc:"Framework nativo para criação de endpoints REST" },
    { id:"DEV_JOBS",     label:"Jobs e Schedule",          desc:"Processos em background, agendamentos e rotinas automáticas" },

    // 7. Conhecimento Funcional
    { id:"DEV_FUN_FIN",  label:"Funcional — Financeiro",   desc:"Regras de negócio do módulo financeiro (contas a pagar/receber)" },
    { id:"DEV_FUN_FAT",  label:"Funcional — Faturamento",  desc:"Regras de notas fiscais, pedidos e processo de faturamento" },
    { id:"DEV_FUN_COM",  label:"Funcional — Compras",      desc:"Fluxo de compras, pedidos, cotações e aprovações" },
    { id:"DEV_FUN_EST",  label:"Funcional — Estoque",      desc:"Movimentações, saldos, inventário e rastreabilidade" },
    { id:"DEV_FUN_CTB",  label:"Funcional — Contabilidade",desc:"Lançamentos, plano de contas, centros de custo e conciliação" },
    { id:"DEV_FUN_FIS",  label:"Funcional — Fiscal",       desc:"Apuração de impostos, SPED, NF-e e obrigações acessórias" },
    { id:"DEV_FUN_RH",   label:"Funcional — RH / Folha",   desc:"Folha de pagamento, admissão, demissão e benefícios" },

    // 8. Versionamento
    { id:"DEV_GIT",      label:"Git",                      desc:"Controle de versão — commits, branches, merge e rebase" },
    { id:"DEV_GITLAB",   label:"GitLab / GitHub",          desc:"Plataformas de repositório, CI/CD e code review" },

    // 9. Performance e Arquitetura
    { id:"DEV_TUNING_SQL",label:"Tuning SQL",              desc:"Otimização de queries, planos de execução e índices" },
    { id:"DEV_TUNING_ADV",label:"Otimização AdvPL",        desc:"Boas práticas de performance em loops, arrays e chamadas ao banco" },
    { id:"DEV_DEPLOY",   label:"Deploy e Atualização",     desc:"Processos de deploy, atualização de dicionário e migração de versão" },
    { id:"DEV_AMBIENTES",label:"Gestão de Ambientes",      desc:"Configuração de ambientes (homologação, produção) e RPO" },
  ],
};

const NIVEIS = [
  { id:"especialista", label:"Especialista", color:"#a78bfa", bg:"#a78bfa22" },
  { id:"senior",       label:"Sênior",       color:"#22d3a0", bg:"#22d3a022" },
  { id:"pleno",        label:"Pleno",        color:"#f5a623", bg:"#f5a62322" },
  { id:"junior",       label:"Júnior",       color:"#6e6e88", bg:"#6e6e8822" },
];

function GradeConhecimento({ consultorName, userId, readOnly }) {
  const [grade, setGrade] = React.useState({});
  const [produtosSel, setProdutosSel] = React.useState(new Set());
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [activeProd, setActiveProd] = React.useState("Protheus");
  const [search, setSearch] = React.useState("");
  const [erro, setErro] = React.useState(null);

  // Gera key segura para Firestore (só letras, números e underscore, max 100 chars)
  const makeKey = (name) =>
    "grade_" + (name||"").trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"").slice(0,80);

  // Carregar do Firestore
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setErro(null);
      setGrade({});
      setProdutosSel(new Set());
      if (!consultorName) { setLoading(false); return; }
      try {
        const key = makeKey(consultorName);
        const snap = await getDoc(doc(db, "app_data", key));
        if (cancelled) return;
        if (snap.exists()) {
          const val = snap.data().value || {};
          setGrade(val.modulos || {});
          setProdutosSel(new Set(Array.isArray(val.produtos) ? val.produtos : []));
        }
      } catch(e) {
        if (!cancelled) setErro("Erro ao carregar grade: " + e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [consultorName]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const key = makeKey(consultorName);
      await setDoc(doc(db, "app_data", key), { value: { modulos: grade, produtos: [...produtosSel], atualizadoEm: new Date().toISOString() } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch(e) {
      console.error("Erro ao salvar grade:", e);
    } finally {
      setSaving(false);
    }
  };

  const toggleProduto = (prod) => {
    setProdutosSel(prev => {
      const n = new Set(prev);
      if (n.has(prod)) {
        n.delete(prod);
        // Remove módulos deste produto da grade
        const mods = (TOTVS_MODULOS[prod]||[]).map(m=>m.id);
        setGrade(g => { const ng = {...g}; mods.forEach(id => delete ng[id]); return ng; });
      } else {
        n.add(prod);
      }
      return n;
    });
  };

  const setNivel = (modId, nivel) => {
    setGrade(prev => {
      if (prev[modId] === nivel) { const n={...prev}; delete n[modId]; return n; }
      return {...prev, [modId]: nivel};
    });
  };

  const modulos = (TOTVS_MODULOS[activeProd]||[]).filter(m =>
    !search || m.label.toLowerCase().includes(search.toLowerCase()) || m.desc.toLowerCase().includes(search.toLowerCase())
  );

  const totalConhecimentos = Object.keys(grade).length;
  const nivelCounts = NIVEIS.map(n => ({ ...n, count: Object.values(grade).filter(v=>v===n.id).length }));

  if (loading) return (
    <div style={{ textAlign:"center",padding:"60px",color:"#3e3e55" }}>
      <div style={{ width:"32px",height:"32px",border:"3px solid #1f1f2e",borderTop:"3px solid #6c63ff",borderRadius:"50%",animation:"spin .7s linear infinite",margin:"0 auto 16px" }}/>
      <div style={{ fontSize:"13px" }}>Carregando grade de conhecimento...</div>
    </div>
  );

  if (erro) return (
    <div style={{ textAlign:"center",padding:"60px",color:"#f04f5e",background:"#f04f5e10",borderRadius:"16px",border:"1px solid #f04f5e30" }}>
      <div style={{ fontSize:"32px",marginBottom:"12px" }}>⚠️</div>
      <div style={{ fontSize:"13px" }}>{erro}</div>
    </div>
  );

  return (
    <div style={{ maxWidth:"1000px" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"24px",gap:"16px",flexWrap:"wrap" }}>
        <div>
          <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:900,color:"#f0f0fa",margin:"0 0 6px",letterSpacing:"-0.3px" }}>
            🎓 Grade de Conhecimento TOTVS
          </h2>
          <p style={{ fontSize:"12px",color:"#3e3e55",margin:0 }}>
            {readOnly ? `Conhecimentos declarados por ${consultorName}` : "Selecione seus produtos e defina o nível em cada módulo"}
          </p>
        </div>
        <div style={{ display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap" }}>
          {/* Resumo por nível */}
          {nivelCounts.filter(n=>n.count>0).map(n=>(
            <div key={n.id} style={{ padding:"5px 12px",borderRadius:"99px",background:n.bg,border:"1px solid "+n.color+"44",display:"flex",alignItems:"center",gap:"6px" }}>
              <span style={{ fontSize:"11px",fontWeight:700,color:n.color }}>{n.count}</span>
              <span style={{ fontSize:"10px",color:n.color,opacity:0.8 }}>{n.label}</span>
            </div>
          ))}
          {!readOnly && (
            <button onClick={handleSave} disabled={saving}
              style={{ padding:"9px 20px",borderRadius:"10px",border:"none",background:saved?"#22d3a0":"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",fontWeight:700,fontSize:"13px",cursor:"pointer",fontFamily:"inherit",boxShadow:saved?"0 4px 16px #22d3a044":"0 4px 16px #6c63ff44",transition:"all .2s" }}>
              {saving?"⏳ Salvando...":saved?"✅ Salvo!":"💾 Salvar grade"}
            </button>
          )}
        </div>
      </div>

      {/* Seleção de produtos */}
      <div style={{ marginBottom:"20px" }}>
        <div style={{ fontSize:"11px",color:"#3e3e55",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"10px" }}>Produtos com conhecimento</div>
        <div style={{ display:"flex",gap:"10px",flexWrap:"wrap" }}>
          {TOTVS_PRODUTOS.map(prod => {
            const sel = produtosSel.has(prod);
            const count = (TOTVS_MODULOS[prod]||[]).filter(m=>grade[m.id]).length;
            return (
              <div key={prod}
                onClick={()=>!readOnly && toggleProduto(prod)}
                style={{ padding:"10px 18px",borderRadius:"12px",border:"1px solid "+(sel?"#6c63ff":"#2a2a3a"),background:sel?"#6c63ff18":"#111118",cursor:readOnly?"default":"pointer",transition:"all .2s",display:"flex",alignItems:"center",gap:"10px" }}>
                <div style={{ width:"10px",height:"10px",borderRadius:"3px",background:sel?"#6c63ff":"#2a2a3a",transition:"background .2s" }}/>
                <div>
                  <div style={{ fontSize:"13px",fontWeight:700,color:sel?"#a78bfa":"#6e6e88" }}>{prod}</div>
                  {count>0 && <div style={{ fontSize:"10px",color:"#6c63ff",marginTop:"1px" }}>{count} módulo{count>1?"s":""}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {produtosSel.size === 0 && (
        <div style={{ textAlign:"center",padding:"48px 20px",background:"#111118",borderRadius:"16px",border:"1px solid #1f1f2e" }}>
          <div style={{ fontSize:"40px",marginBottom:"12px" }}>🎯</div>
          <div style={{ fontSize:"14px",color:"#3e3e55" }}>Selecione os produtos TOTVS que você conhece para definir seus módulos</div>
        </div>
      )}

      {produtosSel.size > 0 && (
        <div style={{ background:"#111118",borderRadius:"16px",border:"1px solid #1f1f2e",overflow:"hidden" }}>
          {/* Tabs de produto */}
          <div style={{ display:"flex",borderBottom:"1px solid #1f1f2e",background:"#0d0d14",overflowX:"auto" }}>
            {[...produtosSel].map(prod => {
              const count = (TOTVS_MODULOS[prod]||[]).filter(m=>grade[m.id]).length;
              return (
                <button key={prod} onClick={()=>{ setActiveProd(prod); setSearch(""); }}
                  style={{ padding:"12px 20px",border:"none",borderBottom:"2px solid "+(activeProd===prod?"#6c63ff":"transparent"),background:"transparent",color:activeProd===prod?"#a78bfa":"#3e3e55",fontWeight:activeProd===prod?700:400,fontSize:"13px",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"8px",transition:"all .15s" }}>
                  {prod}
                  {count>0&&<span style={{ fontSize:"10px",background:"#6c63ff33",color:"#6c63ff",padding:"1px 7px",borderRadius:"99px",fontWeight:700 }}>{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Busca módulo */}
          <div style={{ padding:"12px 16px",borderBottom:"1px solid #1f1f2e",display:"flex",alignItems:"center",gap:"8px" }}>
            <div style={{ position:"relative",flex:1,maxWidth:"280px" }}>
              <span style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",fontSize:"12px",color:"#3e3e55",pointerEvents:"none" }}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar módulo..."
                style={{ width:"100%",padding:"7px 10px 7px 30px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"12px",fontFamily:"inherit",outline:"none",boxSizing:"border-box" }}/>
            </div>
            <div style={{ fontSize:"11px",color:"#3e3e55" }}>
              {(TOTVS_MODULOS[activeProd]||[]).filter(m=>grade[m.id]).length} / {(TOTVS_MODULOS[activeProd]||[]).length} módulos preenchidos
            </div>
          </div>

          {/* Legenda de níveis */}
          <div style={{ padding:"10px 16px",borderBottom:"1px solid #1f1f2e",display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center" }}>
            <span style={{ fontSize:"10px",color:"#3e3e55",fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",marginRight:"4px" }}>Níveis:</span>
            {NIVEIS.map(n=>(
              <div key={n.id} style={{ display:"flex",alignItems:"center",gap:"4px" }}>
                <div style={{ width:"8px",height:"8px",borderRadius:"2px",background:n.color }}/>
                <span style={{ fontSize:"11px",color:n.color,fontWeight:600 }}>{n.label}</span>
              </div>
            ))}
          </div>

          {/* Tabela de módulos */}
          <div style={{ overflowY:"auto",maxHeight:"480px" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead style={{ position:"sticky",top:0,zIndex:2 }}>
                <tr style={{ background:"#0d0d14" }}>
                  <th style={{ padding:"10px 16px",textAlign:"left",fontSize:"10px",color:"#3e3e55",fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",width:"40%" }}>Módulo</th>
                  {NIVEIS.map(n=>(
                    <th key={n.id} style={{ padding:"10px 8px",textAlign:"center",fontSize:"10px",color:n.color,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase" }}>{n.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modulos.map((mod,idx)=>{
                  const nivelAtual = grade[mod.id];
                  const grupos = TOTVS_GRUPOS[activeProd];
                  const grupoAtual = grupos?.[mod.id];
                  const grupoAnterior = idx > 0 ? grupos?.[modulos[idx-1].id] : null;
                  const showGrupoHeader = grupoAtual && grupoAtual !== grupoAnterior && !search;
                  return (
                    <React.Fragment key={mod.id}>
                      {showGrupoHeader && (
                        <tr>
                          <td colSpan={5} style={{ padding:"10px 16px 6px",background:"#0d0d14",borderBottom:"1px solid #1f1f2e" }}>
                            <span style={{ fontSize:"10px",fontWeight:700,color:"#6c63ff",letterSpacing:"1px",textTransform:"uppercase" }}>
                              {grupoAtual}
                            </span>
                          </td>
                        </tr>
                      )}
                    <tr style={{ borderBottom:"1px solid #18181f",background:nivelAtual?(NIVEIS.find(n=>n.id===nivelAtual)?.bg||"transparent"):"transparent",transition:"background .15s" }}>
                      <td style={{ padding:"11px 16px" }}>
                        <div style={{ fontSize:"12px",fontWeight:700,color:nivelAtual?"#f0f0fa":"#c8c8d8" }}>{mod.label}</div>
                        <div style={{ fontSize:"11px",color:"#3e3e55",marginTop:"2px" }}>{mod.desc}</div>
                      </td>
                      {NIVEIS.map(n=>{
                        const sel = nivelAtual === n.id;
                        return (
                          <td key={n.id} style={{ padding:"8px",textAlign:"center" }}>
                            <button
                              onClick={()=>!readOnly && setNivel(mod.id, n.id)}
                              style={{ width:"36px",height:"36px",borderRadius:"10px",border:"1px solid "+(sel?n.color:"#2a2a3a"),background:sel?n.bg:"transparent",cursor:readOnly?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto",transition:"all .15s" }}
                              title={n.label}>
                              {sel
                                ? <span style={{ fontSize:"16px",color:n.color }}>●</span>
                                : <span style={{ fontSize:"14px",color:"#2a2a3a" }}>○</span>
                              }
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                    </React.Fragment>
                  );
                })}
                {modulos.length===0&&(
                  <tr><td colSpan={5} style={{ textAlign:"center",padding:"32px",fontSize:"12px",color:"#3e3e55" }}>Nenhum módulo encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VISUALIZAÇÃO SEMANAL GLOBAL (todos os consultores, semana a semana)
// ─────────────────────────────────────────────────────────────────────────────
function WeeklyGlobalView({ weeklyData, offset, setOffset, clientColorMap, canEdit, onEdit, onNewEntry, onOsClick, theme: T }) {
  const { days, consultores: allConsultores } = weeklyData;
  const WD_SHORT = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
  const today = new Date(); today.setHours(0,0,0,0);

  // ── Filtros internos ──
  const [search, setSearch] = React.useState("");
  const [selConsultores, setSelConsultores] = React.useState(new Set()); // vazio = todos
  const [selClientes, setSelClientes] = React.useState(new Set());       // vazio = todos
  const [showConsFilter, setShowConsFilter] = React.useState(false);
  const [showCliFilter, setShowCliFilter] = React.useState(false);
  const consRef = React.useRef(null);
  const cliRef  = React.useRef(null);

  // Fechar dropdowns ao clicar fora
  React.useEffect(() => {
    const handler = (e) => {
      if (consRef.current && !consRef.current.contains(e.target)) setShowConsFilter(false);
      if (cliRef.current  && !cliRef.current.contains(e.target))  setShowCliFilter(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Coletar todos os clientes únicos da semana
  const allClientes = React.useMemo(() => {
    const set = new Set();
    allConsultores.forEach(({cells}) => cells.forEach(entries => entries.forEach(e => { if(e.client) set.add(e.client); })));
    return [...set].sort();
  }, [allConsultores]);

  // Aplicar filtros
  const consultores = React.useMemo(() => {
    return allConsultores
      .filter(({name}) => {
        if (selConsultores.size > 0 && !selConsultores.has(name)) return false;
        if (search.trim()) return name.toLowerCase().includes(search.toLowerCase());
        return true;
      })
      .map(({name, cells}) => ({
        name,
        cells: cells.map(entries =>
          entries.filter(e => {
            if (selClientes.size > 0 && e.client && !selClientes.has(e.client)) return false;
            if (search.trim() && selConsultores.size === 0) {
              // quando busca sem filtro de consultor, filtra também por cliente
              const q = search.toLowerCase();
              const matchCons = name.toLowerCase().includes(q);
              const matchCli  = (e.client||"").toLowerCase().includes(q);
              if (!matchCons && !matchCli) return false;
            }
            return true;
          })
        )
      }));
  }, [allConsultores, selConsultores, selClientes, search]);

  const fmtRange = () => {
    const start = days[0], end = days[6];
    const fmt = d => d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}).replace(".","");
    return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;
  };

  const getColor = (entry) => {
    if (!entry) return "#6b7280";
    if (entry.type==="vacation") return "#0891b2";
    if (entry.type==="absence") return "#f04f5e";
    if (entry.type==="holiday") return "#d97706";
    if (entry.type==="blocked") return "#374151";
    if (entry.type==="reserved") return "#6366f1";
    const key = clientColorMap && Object.keys(clientColorMap).find(k => (entry.client||"").toUpperCase().includes(k));
    return key ? clientColorMap[key] : CLIENT_COLORS.default;
  };

  const toggleSet = (set, setFn, val) => setFn(prev => {
    const n = new Set(prev);
    n.has(val) ? n.delete(val) : n.add(val);
    return n;
  });

  const dropStyle = { position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:500,background:"#111118",border:"1px solid #2a2a3a",borderRadius:"12px",boxShadow:"0 8px 32px rgba(0,0,0,0.6)",minWidth:"200px",maxHeight:"260px",overflowY:"auto",padding:"6px" };
  const chipActive = { padding:"5px 12px",borderRadius:"99px",border:"1px solid #6c63ff",background:"#6c63ff22",color:"#a78bfa",fontSize:"12px",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" };
  const chipInactive = { padding:"5px 12px",borderRadius:"99px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",fontSize:"12px",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" };

  // Popup de detalhe (para visualização e edição)
  const [popup, setPopup] = React.useState(null); // { entry, name, x, y }
  const [popupPos, setPopupPos] = React.useState({x:0,y:0});
  const startDragPopup = React.useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX - popupPos.x, startY = e.clientY - popupPos.y;
    const onMove = (ev) => setPopupPos({ x: ev.clientX - startX, y: ev.clientY - startY });
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [popupPos]);

  const TIPO_LABEL = { client:"👤 Cliente", vacation:"🏖 Férias", holiday:"🎉 Feriado", reserved:"🔒 Reservado", blocked:"⛔ Bloqueado" };
  const NIVEL_MODAL = { especialista:{label:"Especialista",color:"#a78bfa"}, senior:{label:"Sênior",color:"#22d3a0"}, pleno:{label:"Pleno",color:"#f5a623"}, junior:{label:"Júnior",color:"#6e6e88"} };

  return (
    <div>
      {/* ── Barra de filtros ── */}
      <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"16px",flexWrap:"wrap" }}>
        {/* Busca */}
        <div style={{ position:"relative",display:"flex",alignItems:"center",flex:"1",minWidth:"180px",maxWidth:"260px" }}>
          <span style={{ position:"absolute",left:"10px",fontSize:"13px",color:"#3e3e55",pointerEvents:"none" }}>🔍</span>
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar consultor ou cliente..."
            style={{ width:"100%",padding:"8px 12px 8px 32px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"12px",fontFamily:"inherit",outline:"none" }}
          />
          {search && <button onClick={()=>setSearch("")} style={{ position:"absolute",right:"8px",background:"none",border:"none",color:"#3e3e55",cursor:"pointer",fontSize:"14px",lineHeight:1 }}>✕</button>}
        </div>

        {/* Filtro consultores */}
        <div ref={consRef} style={{ position:"relative" }}>
          <button onClick={()=>{ setShowConsFilter(v=>!v); setShowCliFilter(false); }}
            style={selConsultores.size>0 ? chipActive : chipInactive}>
            👥 Consultores{selConsultores.size>0?` (${selConsultores.size})`:""}
            <span style={{ marginLeft:"5px",fontSize:"9px" }}>▾</span>
          </button>
          {showConsFilter && (
            <div style={dropStyle}>
              <div style={{ padding:"6px 8px 8px",borderBottom:"1px solid #1f1f2e",marginBottom:"4px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <span style={{ fontSize:"11px",color:"#6e6e88",fontWeight:700 }}>CONSULTORES</span>
                {selConsultores.size>0 && <button onClick={()=>setSelConsultores(new Set())} style={{ background:"none",border:"none",color:"#6c63ff",fontSize:"11px",cursor:"pointer",fontWeight:600 }}>Limpar</button>}
              </div>
              {allConsultores.map(({name},i)=>{
                const sel = selConsultores.has(name);
                return (
                  <div key={name} onClick={()=>toggleSet(selConsultores,setSelConsultores,name)}
                    style={{ display:"flex",alignItems:"center",gap:"8px",padding:"7px 10px",borderRadius:"8px",cursor:"pointer",background:sel?"#6c63ff15":"transparent" }}
                    onMouseEnter={e=>!sel&&(e.currentTarget.style.background="#18181f")}
                    onMouseLeave={e=>!sel&&(e.currentTarget.style.background="transparent")}>
                    <div style={{ width:"22px",height:"22px",borderRadius:"50%",background:`hsl(${i*37%360},55%,48%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:800,color:"#fff",flexShrink:0 }}>
                      {name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <span style={{ fontSize:"12px",color:sel?"#a78bfa":"#c8c8d8",fontWeight:sel?600:400,flex:1 }}>{name.split(" ")[0]}</span>
                    {sel && <span style={{ color:"#6c63ff",fontSize:"14px" }}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Filtro clientes */}
        <div ref={cliRef} style={{ position:"relative" }}>
          <button onClick={()=>{ setShowCliFilter(v=>!v); setShowConsFilter(false); }}
            style={selClientes.size>0 ? chipActive : chipInactive}>
            🏢 Clientes{selClientes.size>0?` (${selClientes.size})`:""}
            <span style={{ marginLeft:"5px",fontSize:"9px" }}>▾</span>
          </button>
          {showCliFilter && (
            <div style={dropStyle}>
              <div style={{ padding:"6px 8px 8px",borderBottom:"1px solid #1f1f2e",marginBottom:"4px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <span style={{ fontSize:"11px",color:"#6e6e88",fontWeight:700 }}>CLIENTES</span>
                {selClientes.size>0 && <button onClick={()=>setSelClientes(new Set())} style={{ background:"none",border:"none",color:"#6c63ff",fontSize:"11px",cursor:"pointer",fontWeight:600 }}>Limpar</button>}
              </div>
              {allClientes.length===0 && <div style={{ padding:"12px",fontSize:"12px",color:"#3e3e55",textAlign:"center" }}>Nenhum cliente nesta semana</div>}
              {allClientes.map(cli=>{
                const sel = selClientes.has(cli);
                const color = clientColorMap && Object.keys(clientColorMap).find(k=>cli.toUpperCase().includes(k));
                const dot = color ? clientColorMap[color] : "#6e6e88";
                return (
                  <div key={cli} onClick={()=>toggleSet(selClientes,setSelClientes,cli)}
                    style={{ display:"flex",alignItems:"center",gap:"8px",padding:"7px 10px",borderRadius:"8px",cursor:"pointer",background:sel?"#6c63ff15":"transparent" }}
                    onMouseEnter={e=>!sel&&(e.currentTarget.style.background="#18181f")}
                    onMouseLeave={e=>!sel&&(e.currentTarget.style.background="transparent")}>
                    <div style={{ width:"10px",height:"10px",borderRadius:"3px",background:dot,flexShrink:0 }}/>
                    <span style={{ fontSize:"12px",color:sel?"#a78bfa":"#c8c8d8",fontWeight:sel?600:400,flex:1 }}>{cli}</span>
                    {sel && <span style={{ color:"#6c63ff",fontSize:"14px" }}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tags de filtros ativos */}
        {[...selConsultores].map(name=>(
          <span key={name} style={{ display:"inline-flex",alignItems:"center",gap:"5px",padding:"4px 10px",borderRadius:"99px",background:"#6c63ff22",border:"1px solid #6c63ff44",color:"#a78bfa",fontSize:"11px",fontWeight:600 }}>
            {name.split(" ")[0]}
            <button onClick={()=>toggleSet(selConsultores,setSelConsultores,name)} style={{ background:"none",border:"none",color:"#6c63ff",cursor:"pointer",fontSize:"12px",lineHeight:1,padding:0 }}>✕</button>
          </span>
        ))}
        {[...selClientes].map(cli=>(
          <span key={cli} style={{ display:"inline-flex",alignItems:"center",gap:"5px",padding:"4px 10px",borderRadius:"99px",background:"#22d3a015",border:"1px solid #22d3a040",color:"#22d3a0",fontSize:"11px",fontWeight:600 }}>
            {cli}
            <button onClick={()=>toggleSet(selClientes,setSelClientes,cli)} style={{ background:"none",border:"none",color:"#22d3a0",cursor:"pointer",fontSize:"12px",lineHeight:1,padding:0 }}>✕</button>
          </span>
        ))}

        {/* Spacer + navegação semana */}
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:"8px" }}>
          <button onClick={()=>setOffset(o=>o-1)} style={{ width:"32px",height:"32px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#18181f",color:"#6e6e88",cursor:"pointer",fontSize:"18px",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
          <div style={{ textAlign:"center",minWidth:"200px" }}>
            <div style={{ fontSize:"15px",fontWeight:700,color:"#f0f0fa" }}>{fmtRange()}</div>
            {offset!==0 && <div style={{ fontSize:"10px",color:"#3e3e55",marginTop:"1px" }}>{offset>0?`+${offset}`:`${offset}`} semana{Math.abs(offset)>1?"s":""} da atual</div>}
          </div>
          <button onClick={()=>setOffset(o=>o+1)} style={{ width:"32px",height:"32px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#18181f",color:"#6e6e88",cursor:"pointer",fontSize:"18px",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center" }}>›</button>
          <button onClick={()=>setOffset(0)} style={{ padding:"6px 14px",borderRadius:"8px",border:"1px solid #6c63ff44",background:"#6c63ff18",color:"#a78bfa",cursor:"pointer",fontSize:"11px",fontWeight:700,opacity:offset===0?0.35:1,whiteSpace:"nowrap" }} disabled={offset===0}>
            📍 Hoje
          </button>
        </div>
      </div>

      {/* ── Tabela ── */}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%",borderCollapse:"collapse",tableLayout:"fixed",minWidth:"700px" }}>
          <colgroup>
            <col style={{ width:"130px" }}/>
            {days.map((_,i)=><col key={i}/>)}
          </colgroup>
          <thead>
            <tr>
              <th style={{ padding:"8px 12px",textAlign:"left",fontSize:"11px",color:"#6e6e88",fontWeight:700,background:"#0d0d14",borderBottom:"2px solid #2a2a3a",letterSpacing:"0.5px" }}>CONSULTOR</th>
              {days.map((d,i)=>{
                const isToday = d.getTime()===today.getTime();
                const isWknd = i>=5;
                return (
                  <th key={i} style={{ padding:"8px 6px",textAlign:"center",fontSize:"11px",fontWeight:700,background:isWknd?"#0a0a12":"#0d0d14",borderBottom:"2px solid "+(isToday?"#6c63ff":"#2a2a3a"),color:isToday?"#a78bfa":isWknd?"#2a2a3a":"#6e6e88",minWidth:"90px" }}>
                    <div style={{ letterSpacing:"0.5px" }}>{WD_SHORT[i]}</div>
                    <div style={{ fontSize:"18px",fontWeight:800,color:isToday?"#a78bfa":isWknd?"#2a2a3a":"#c8c8d8",marginTop:"2px" }}>{d.getDate()}</div>
                    <div style={{ fontSize:"10px",color:isWknd?"#1f1f2e":"#3e3e55",marginTop:"1px" }}>{d.toLocaleDateString("pt-BR",{month:"short"}).replace(".","")}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {consultores.length===0 && (
              <tr><td colSpan={8} style={{ textAlign:"center",padding:"48px",color:"#3e3e55",fontSize:"13px" }}>
                Nenhum consultor encontrado para os filtros selecionados
              </td></tr>
            )}
            {consultores.map(({name, cells},ri)=>{
              const origIdx = allConsultores.findIndex(c=>c.name===name);
              return (
                <tr key={name} style={{ borderBottom:"1px solid #18181f" }}>
                  <td style={{ padding:"8px 10px",verticalAlign:"middle",background:"#0d0d14",borderRight:"2px solid #18181f" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                      <div style={{ width:"28px",height:"28px",borderRadius:"9px",background:`hsl(${origIdx*37%360},55%,48%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:800,color:"#fff",flexShrink:0 }}>
                        {name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                      </div>
                      <span style={{ fontSize:"12px",fontWeight:600,color:"#c8c8d8" }}>{name.split(" ")[0]}</span>
                    </div>
                  </td>
                  {cells.map((entries,ci)=>{
                    const d = days[ci];
                    const isToday = d.getTime()===today.getTime();
                    const isWknd = ci>=5;
                    const mName = MONTHS_ORDER[d.getMonth()];
                    const yr = d.getFullYear();
                    return (
                      <td key={ci}
                        onClick={()=>{ if(canEdit&&onNewEntry&&entries.length===0) onNewEntry({consultor:name,month:mName,day:d.getDate(),year:yr}); }}
                        style={{ padding:"4px",verticalAlign:"top",background:isToday?"#16102a18":isWknd?"#0a0a12":"transparent",borderLeft:"1px solid #18181f",cursor:(canEdit&&entries.length===0)?"pointer":"default",minHeight:"64px" }}>
                        {entries.length===0 && canEdit && (
                          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"56px",opacity:0.1,fontSize:"20px",color:"#6e6e88" }}>+</div>
                        )}
                        {entries.map((entry,ei)=>{
                          const color = getColor(entry);
                          return (
                            <div key={entry.id||ei}
                              onClick={e=>{
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = Math.min(rect.right+8, window.innerWidth-300);
                                const y = Math.min(rect.top, window.innerHeight-340);
                                setPopupPos({x,y});
                                setPopup({entry,name});
                              }}
                              style={{ background:color,borderRadius:"7px",padding:"5px 7px",marginBottom:"3px",cursor:"pointer",transition:"opacity .15s",...(entry.osStatus==="aprovada"&&!!entry.osAvaliadoPor?{opacity:0.45}:{}) }}
                              onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
                              onMouseLeave={e=>{ const isAprov=entry.osStatus==="aprovada"&&!!entry.osAvaliadoPor; e.currentTarget.style.opacity=isAprov?"0.45":"1"; }}
                            >
                              <div style={{ fontSize:"10px",fontWeight:800,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                                {entry.modalidade==="remoto"?"💻 ":entry.modalidade==="presencial"?"🏢 ":""}{entry.client||entry.type}
                              </div>
                              {(entry.horaInicio||entry.horaFim) && (
                                <div style={{ fontSize:"9px",color:"rgba(255,255,255,0.75)",marginTop:"2px" }}>{entry.horaInicio||""}{entry.horaFim?"→"+entry.horaFim:""}</div>
                              )}
                              {entry.osNumero && (
                                <div style={{ fontSize:"8px",color:"rgba(255,255,255,0.6)",marginTop:"1px",display:"flex",alignItems:"center",gap:"2px" }}>
                                  <span>📋</span><span style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{entry.osNumero}</span>
                                  {(()=>{ return entry.osStatus==="aprovada"&&!!entry.osAvaliadoPor; })()&&<span>🔒</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize:"11px",color:"#3e3e55",marginTop:"10px" }}>💡 Clique em agenda para ver detalhes{canEdit?" · Clique em célula vazia para adicionar":""} · Colunas escuras = fim de semana</p>

      {/* Popup de detalhe da entrada */}
      {popup && (
        <div onClick={e=>e.stopPropagation()}
          style={{ position:"fixed",left:popupPos.x+"px",top:popupPos.y+"px",background:"#111118",border:"1px solid #2a2a3a",borderRadius:"14px",zIndex:9000,width:"280px",boxShadow:"0 8px 40px rgba(0,0,0,0.7)",display:"flex",flexDirection:"column",maxHeight:"80vh" }}>
          {/* Header arrastável */}
          <div onMouseDown={startDragPopup}
            style={{ padding:"13px 16px 11px",borderBottom:"1px solid #1f1f2e",flexShrink:0,cursor:"grab",userSelect:"none" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:"13px",fontWeight:700,color:"#f0f0fa" }}>{popup.name.split(" ")[0]}</div>
                <div style={{ fontSize:"11px",color:"#3e3e55",marginTop:"2px" }}>
                  {popup.entry.day && `Dia ${popup.entry.day}`}{popup.entry.month ? ` · ${popup.entry.month}` : ""}{popup.entry.year ? ` ${popup.entry.year}` : ""}
                </div>
              </div>
              <button onMouseDown={e=>e.stopPropagation()} onClick={()=>setPopup(null)}
                style={{ background:"#1f1f2e",border:"1px solid #2a2a3a",color:"#6e6e88",borderRadius:"8px",width:"28px",height:"28px",cursor:"pointer",fontSize:"13px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>✕</button>
            </div>
          </div>

          {/* Corpo do detalhe */}
          <div style={{ padding:"14px 16px",overflowY:"auto",flex:1 }}>
            {/* Cor + cliente */}
            <div style={{ background:getColor(popup.entry),borderRadius:"10px",padding:"10px 14px",marginBottom:"12px" }}>
              <div style={{ fontSize:"13px",fontWeight:800,color:"#fff" }}>
                {popup.entry.modalidade==="remoto"?"💻 ":popup.entry.modalidade==="presencial"?"🏢 ":""}{popup.entry.client||TIPO_LABEL[popup.entry.type]||popup.entry.type}
              </div>
              {popup.entry.modalidade && (
                <div style={{ fontSize:"10px",color:"rgba(255,255,255,0.7)",marginTop:"3px" }}>
                  {popup.entry.modalidade==="remoto"?"Remoto":"Presencial"}
                </div>
              )}
            </div>

            {/* Tipo */}
            <div style={{ fontSize:"11px",color:"#6e6e88",marginBottom:"10px" }}>
              {TIPO_LABEL[popup.entry.type]||popup.entry.type}
            </div>

            {/* Horários */}
            {(popup.entry.horaInicio||popup.entry.horaFim) && (
              <div style={{ background:"#18181f",borderRadius:"8px",padding:"9px 12px",marginBottom:"10px",display:"flex",gap:"14px",flexWrap:"wrap",fontSize:"12px" }}>
                {popup.entry.horaInicio && <span>🕐 <strong style={{ color:"#f0f0fa" }}>{popup.entry.horaInicio}</strong></span>}
                {popup.entry.horaFim    && <span>🕔 <strong style={{ color:"#f0f0fa" }}>{popup.entry.horaFim}</strong></span>}
                {popup.entry.intervalo  && <span>☕ <strong style={{ color:"#f0f0fa" }}>{popup.entry.intervalo}min</strong></span>}
              </div>
            )}

            {/* Atividades */}
            {popup.entry.atividades && (
              <div style={{ background:"#18181f",borderRadius:"8px",padding:"9px 12px",marginBottom:"10px" }}>
                <div style={{ fontSize:"10px",color:"#3e3e55",fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:"5px" }}>Atividades</div>
                <div style={{ fontSize:"12px",color:"#c8c8d8",lineHeight:1.6,whiteSpace:"pre-wrap" }}>{popup.entry.atividades}</div>
              </div>
            )}

            {/* Histórico */}
            {popup.entry.criadoPor && (
              <div style={{ fontSize:"10px",color:"#3e3e55",marginBottom:"4px" }}>
                ✏️ Criado por <strong style={{ color:"#6e6e88" }}>{popup.entry.criadoPor}</strong>
                {popup.entry.criadoEm && <span> em {new Date(popup.entry.criadoEm).toLocaleDateString("pt-BR")}</span>}
              </div>
            )}
            {popup.entry.alteradoPor && (
              <div style={{ fontSize:"10px",color:"#3e3e55" }}>
                🔄 Alterado por <strong style={{ color:"#6e6e88" }}>{popup.entry.alteradoPor}</strong>
                {popup.entry.alteradoEm && <span> em {new Date(popup.entry.alteradoEm).toLocaleDateString("pt-BR")}</span>}
              </div>
            )}

            {/* Botões de ação — fora do scroll, sempre visíveis */}
            </div>
          <div style={{ padding:"0 16px 14px",flexShrink:0,display:"flex",flexDirection:"column",gap:"7px",borderTop:"1px solid #1f1f2e",paddingTop:"12px" }}>
              {(()=>{
                const osAprov = popup.entry.osStatus==="aprovada" && !!popup.entry.osAvaliadoPor;
                return (
                  <>
                    {popup.entry.osNumero && (
                      <div style={{ display:"flex",alignItems:"center",gap:"6px",padding:"6px 8px",background:"#22d3a00a",borderRadius:"8px",border:"1px solid #22d3a020" }}>
                        <span style={{ fontSize:"11px",fontWeight:700,color:"#22d3a0" }}>📋 OS {popup.entry.osNumero}</span>
                        {osAprov && <span style={{ fontSize:"9px",padding:"1px 7px",borderRadius:"99px",background:"#22d3a018",color:"#22d3a0",fontWeight:700 }}>✅ Aprovada</span>}
                      </div>
                    )}
                    {osAprov ? (
                      <div style={{ fontSize:"10px",color:"#6e6e88",padding:"6px 8px",background:"#1f1f2e",borderRadius:"8px",textAlign:"center" }}>
                        🔒 Aprovada por <strong style={{ color:"#a0a0b0" }}>{popup.entry.osAvaliadoPor}</strong> — somente leitura
                      </div>
                    ) : (
                      <>
                        {onOsClick && (
                          <button onMouseDown={e=>e.stopPropagation()}
                            onClick={()=>{ onOsClick({...popup.entry, consultor:popup.name}); setPopup(null); }}
                            style={{ width:"100%",padding:"9px",borderRadius:"9px",border:"1px solid #22d3a044",background:"#22d3a015",color:"#22d3a0",fontWeight:700,fontSize:"12px",cursor:"pointer",fontFamily:"inherit" }}>
                            📋 Preencher Ordem de Serviço
                          </button>
                        )}
                        {canEdit && onEdit && (
                          <button onMouseDown={e=>e.stopPropagation()}
                            onClick={()=>{ onEdit(popup.entry, popup.name); setPopup(null); }}
                            style={{ width:"100%",padding:"9px",borderRadius:"9px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",fontWeight:700,fontSize:"12px",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px #6c63ff44" }}>
                            ✏️ Editar agenda
                          </button>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDÁRIO MENSAL
// ─────────────────────────────────────────────────────────────────────────────
function CalendarioMensal({ data, selectedMonth, allMonths, consultores, clientColors, onEdit, onDelete, onNewEntry, onOsClick, readonly }) {
  const [calMes, setCalMes] = React.useState(selectedMonth !== "Todos" ? selectedMonth : MONTHS_ORDER[new Date().getMonth()]);
  const [calAno, setCalAno] = React.useState(new Date().getFullYear());
  const [popup, setPopup] = React.useState(null);
  const [popupPos, setPopupPos] = React.useState({x:0,y:0});
  const dragRef = React.useRef(null);
  const startDrag = React.useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX - popupPos.x, startY = e.clientY - popupPos.y;
    const onMove = (ev) => setPopupPos({ x: ev.clientX - startX, y: ev.clientY - startY });
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [popupPos]);
  const openPopup = React.useCallback((entries, x, y) => {
    setPopupPos({ x: Math.min(x+8, window.innerWidth-300), y: Math.min(y+8, window.innerHeight-340) });
    setPopup(entries);
  }, []);
  const [selectedConsultores, setSelectedConsultores] = React.useState(new Set(consultores));
  const [showFilter, setShowFilter] = React.useState(false);
  const [showClientFilter, setShowClientFilter] = React.useState(false);
  const [selectedClients, setSelectedClients] = React.useState(new Set());

  // Sincronizar selectedConsultores apenas quando consultores são adicionados/removidos
  // Não reseta o filtro ao salvar agenda (scheduleData muda mas consultores permanecem iguais)
  React.useEffect(() => {
    setSelectedConsultores(prev => {
      const prevList = [...prev];
      const added   = consultores.filter(c => !prevList.includes(c));
      const removed = prevList.filter(c => !consultores.includes(c));
      if (added.length === 0 && removed.length === 0) return prev;
      const next = new Set(prev);
      added.forEach(c => next.add(c));
      removed.forEach(c => next.delete(c));
      return next;
    });
  }, [consultores.join(",")]);

  // Sincronizar calMes quando o filtro externo muda para um mês específico
  React.useEffect(() => {
    if (selectedMonth !== "Todos") setCalMes(selectedMonth);
  }, [selectedMonth]);

  const monthsAvail = allMonths.filter(m => m !== "Todos");
  const days = Array.from({length:31},(_,i)=>i+1);

  const lookup = {};
  for (const [name, entries] of Object.entries(data)) {
    lookup[name] = {};
    entries.filter(e => {
      const monthMatch = e.month.toUpperCase() === calMes.toUpperCase();
      const yearMatch  = !e.year || e.year === calAno;
      return monthMatch && yearMatch;
    }).forEach(e=>{ if (!lookup[name][e.day]) lookup[name][e.day]=[]; lookup[name][e.day].push(e); });
  }

  // All unique clients present in this month
  const allClientsInMonth = React.useMemo(() => {
    const set = new Set();
    consultores.forEach(name => {
      (data[name]||[]).filter(e =>
        e.month.toUpperCase()===calMes.toUpperCase() &&
        (!e.year || e.year===calAno) &&
        e.type==="client"
      ).forEach(e => set.add(normalizeClient(e.client)));
    });
    return [...set].sort();
  }, [data, consultores, calMes]);

  // Sincronizar selectedClients: resetar só quando mês muda; adicionar novos clientes sem remover seleção atual
  const prevCalMesRef = React.useRef(calMes);
  React.useEffect(() => {
    const mesChanged = prevCalMesRef.current !== calMes;
    prevCalMesRef.current = calMes;
    if (mesChanged) {
      // Mês mudou → resetar filtro completamente
      setSelectedClients(new Set(allClientsInMonth));
    } else {
      // Dados mudaram (novo save) → apenas adicionar novos clientes, preservar seleção atual
      setSelectedClients(prev => {
        const novos = allClientsInMonth.filter(c => ![...prev].includes(c));
        if (novos.length === 0) return prev;
        const next = new Set(prev);
        novos.forEach(c => next.add(c));
        return next;
      });
    }
  }, [calMes, allClientsInMonth.join(",")]);

  const toggleConsultor = (name) => {
    setSelectedConsultores(prev => {
      const next = new Set(prev);
      if (next.has(name)) { if (next.size > 1) next.delete(name); }
      else next.add(name);
      return next;
    });
  };
  const selectAllConsultores = () => setSelectedConsultores(new Set(consultores));
  const clearAllConsultores  = () => setSelectedConsultores(new Set([consultores[0]]));

  const toggleClient = (name) => {
    setSelectedClients(prev => {
      const next = new Set(prev);
      if (next.has(name)) { if (next.size > 1) next.delete(name); }
      else next.add(name);
      return next;
    });
  };
  const selectAllClients = () => setSelectedClients(new Set(allClientsInMonth));
  const clearAllClients  = () => setSelectedClients(new Set([allClientsInMonth[0]]));

  const clientFilterActive = selectedClients.size < allClientsInMonth.length;

  const allConsultoresWithData = consultores.filter(name=>
    (data[name]||[]).some(e =>
      e.month.toUpperCase()===calMes.toUpperCase() && (!e.year || e.year===calAno)
    )
  );
  const activeConsultores = consultores.filter(name => selectedConsultores.has(name));

  // Map month name → approximate year/month for Date calculations
  const MONTH_MAP = { "janeiro":1,"fevereiro":2,"março":3,"abril":4,"maio":5,"junho":6,"julho":7,"agosto":8,"setembro":9,"outubro":10,"novembro":11,"dezembro":12 };
  const monthNum = MONTH_MAP[calMes.toLowerCase()] || 1;
  const guessYear = calAno;

  // How many days does this month actually have?
  const daysInMonth = new Date(guessYear, monthNum, 0).getDate();

  // Get weekday for each day (0=Sun,1=Mon,...,6=Sat)
  const getDayOfWeek = (d) => new Date(guessYear, monthNum - 1, d).getDay();
  const WEEKDAY_LABELS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sab"];

  // All days 1..daysInMonth (no filtering — show every day of the month)
  const allDays = Array.from({length: daysInMonth}, (_, i) => i + 1);

  const getColor = (entry) => {
    if (!entry) return null;
    if (entry.type==="vacation") return "#22c55e";
    if (entry.type==="absence") return "#f04f5e";
    if (entry.type==="holiday") return "#ef4444";
    if (entry.type==="reserved") return "#6e6e88";
    if (entry.type==="blocked") return "#6e6e88";
    const cname = normalizeClient(entry.client);
    return clientColors[cname] || getClientColor(entry.client);
  };

  const closeAll = () => { setPopup(null); setShowFilter(false); setShowClientFilter(false); };

  return (
    <div onClick={closeAll}>
      {/* MONTH SELECTOR */}
      <div style={{ display:"flex",alignItems:"center",gap:"16px",marginBottom:"16px",flexWrap:"wrap" }}>
        <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:700,color:"#f0f0fa",margin:0 }}>📆 Calendário Mensal</h2>
        <div style={{ display:"flex",gap:"6px",flexWrap:"wrap" }}>
          {monthsAvail.map(m=>(
            <button key={m} onClick={()=>setCalMes(m)} style={{ padding:"5px 12px",borderRadius:"16px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,background:calMes===m?"#3b82f6":"#18181f",color:calMes===m?"#fff":"#6e6e88" }}>{m.slice(0,3)}</button>
          ))}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:"4px" }}>
          <button onClick={()=>setCalAno(a=>a-1)} style={{ padding:"4px 8px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#18181f",color:"#6e6e88",cursor:"pointer",fontSize:"13px",fontWeight:700,lineHeight:1 }}>‹</button>
          <span style={{ padding:"4px 14px",borderRadius:"8px",background:"#18181f",border:"1px solid #2a2a3a",fontSize:"13px",fontWeight:700,color:"#f0f0fa",minWidth:"62px",textAlign:"center" }}>{calAno}</span>
          <button onClick={()=>setCalAno(a=>a+1)} style={{ padding:"4px 8px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#18181f",color:"#6e6e88",cursor:"pointer",fontSize:"13px",fontWeight:700,lineHeight:1 }}>›</button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ display:"flex",gap:"12px",marginBottom:"16px",flexWrap:"wrap",alignItems:"flex-start" }} onClick={e=>e.stopPropagation()}>

        {/* ── CONSULTOR FILTER ── */}
        <div style={{ position:"relative" }}>
          <button onClick={()=>{ setShowFilter(!showFilter); setShowClientFilter(false); }} style={{ padding:"7px 16px",borderRadius:"8px",border:"1px solid "+(showFilter?"#3b82f6":"#2a2a3a"),background:showFilter?"#16102a":"#18181f",color:showFilter?"#60a5fa":"#6e6e88",fontSize:"13px",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:"8px",whiteSpace:"nowrap" }}>
            👥 Consultores
            <span style={{ background:selectedConsultores.size<consultores.length?"#f59e0b":"#3b82f6",color:"#fff",borderRadius:"12px",padding:"1px 8px",fontSize:"11px",fontWeight:700 }}>{selectedConsultores.size}/{consultores.length}</span>
            <span style={{ fontSize:"10px" }}>{showFilter?"▲":"▼"}</span>
          </button>
          {showFilter && (
            <div style={{ position:"absolute",top:"calc(100% + 8px)",left:0,background:"#18181f",border:"1px solid #2a2a3a",borderRadius:"12px",padding:"16px",zIndex:500,minWidth:"300px",maxWidth:"440px",boxShadow:"0 12px 40px rgba(0,0,0,0.5)" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px" }}>
                <span style={{ fontSize:"13px",fontWeight:700,color:"#f0f0fa" }}>Filtrar consultores</span>
                <div style={{ display:"flex",gap:"6px" }}>
                  <button onClick={selectAllConsultores} style={{ padding:"4px 10px",borderRadius:"6px",border:"none",background:"#6c63ff22",color:"#60a5fa",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>Todos</button>
                  <button onClick={clearAllConsultores} style={{ padding:"4px 10px",borderRadius:"6px",border:"none",background:"#2a2a3a22",color:"#6e6e88",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>Limpar</button>
                </div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px" }}>
                {consultores.map((name,i)=>{
                  const isSelected = selectedConsultores.has(name);
                  const hasData = allConsultoresWithData.includes(name);
                  return (
                    <button key={name} onClick={()=>toggleConsultor(name)} style={{ display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",borderRadius:"8px",border:"1px solid "+(isSelected?"#6c63ff":"#2a2a3a"),background:isSelected?"#16102a":"#0d0d14",cursor:"pointer",textAlign:"left",opacity:hasData?1:0.45 }}>
                      <div style={{ width:"26px",height:"26px",borderRadius:"50%",background:"hsl("+(i*29%360)+",65%,"+(isSelected?"55%":"30%")+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:700,color:"#fff",flexShrink:0 }}>{getInitials(name)}</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:"12px",fontWeight:600,color:isSelected?"#f0f0fa":"#6e6e88",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{name.trim().split(" ")[0]}</div>
                        {!hasData && <div style={{ fontSize:"10px",color:"#6e6e88" }}>sem dados</div>}
                      </div>
                      {isSelected && <span style={{ color:"#6c63ff",fontSize:"14px",flexShrink:0 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── CLIENT FILTER ── */}
        <div style={{ position:"relative" }}>
          <button onClick={()=>{ setShowClientFilter(!showClientFilter); setShowFilter(false); }} style={{ padding:"7px 16px",borderRadius:"8px",border:"1px solid "+(showClientFilter?"#f59e0b":clientFilterActive?"#f59e0b44":"#2a2a3a"),background:showClientFilter?"#1f1a0e":clientFilterActive?"#1f1a0e":"#18181f",color:showClientFilter||clientFilterActive?"#f59e0b":"#6e6e88",fontSize:"13px",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:"8px",whiteSpace:"nowrap" }}>
            🏢 Clientes
            <span style={{ background:clientFilterActive?"#f59e0b":"#2a2a3a",color:clientFilterActive?"#000":"#6e6e88",borderRadius:"12px",padding:"1px 8px",fontSize:"11px",fontWeight:700 }}>{selectedClients.size}/{allClientsInMonth.length}</span>
            <span style={{ fontSize:"10px" }}>{showClientFilter?"▲":"▼"}</span>
          </button>
          {showClientFilter && (
            <div style={{ position:"absolute",top:"calc(100% + 8px)",left:0,background:"#18181f",border:"1px solid #2a2a3a",borderRadius:"12px",padding:"16px",zIndex:500,minWidth:"280px",maxWidth:"400px",boxShadow:"0 12px 40px rgba(0,0,0,0.5)" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px" }}>
                <span style={{ fontSize:"13px",fontWeight:700,color:"#f0f0fa" }}>Filtrar por cliente</span>
                <div style={{ display:"flex",gap:"6px" }}>
                  <button onClick={selectAllClients} style={{ padding:"4px 10px",borderRadius:"6px",border:"none",background:"#f59e0b22",color:"#f59e0b",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>Todos</button>
                  <button onClick={clearAllClients} style={{ padding:"4px 10px",borderRadius:"6px",border:"none",background:"#2a2a3a22",color:"#6e6e88",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>Limpar</button>
                </div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:"5px",maxHeight:"280px",overflowY:"auto" }}>
                {allClientsInMonth.length === 0 && <p style={{ color:"#6e6e88",fontSize:"12px",textAlign:"center",padding:"12px 0" }}>Nenhum cliente neste mês</p>}
                {allClientsInMonth.map(clientName=>{
                  const isSelected = selectedClients.has(clientName);
                  const color = getClientColor(clientName);
                  return (
                    <button key={clientName} onClick={()=>toggleClient(clientName)} style={{ display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",borderRadius:"8px",border:"1px solid "+(isSelected?color+"66":"#2a2a3a"),background:isSelected?color+"18":"#0d0d14",cursor:"pointer",textAlign:"left" }}>
                      <div style={{ width:"10px",height:"10px",borderRadius:"3px",background:isSelected?color:"#6e6e88",flexShrink:0,transition:"background 0.2s" }}/>
                      <span style={{ fontSize:"13px",fontWeight:600,color:isSelected?color:"#6e6e88",flex:1 }}>{clientName}</span>
                      {isSelected && <span style={{ color:color,fontSize:"14px" }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ACTIVE CLIENT PILLS */}
        <div style={{ display:"flex",gap:"6px",flexWrap:"wrap",alignItems:"center",flex:1 }}>
          {clientFilterActive && [...selectedClients].map(c=>{
            const color = getClientColor(c);
            return (
              <div key={c} style={{ display:"flex",alignItems:"center",gap:"5px",padding:"4px 10px",borderRadius:"20px",background:color+"18",border:"1px solid "+color+"44",fontSize:"12px",fontWeight:600,color:color }}>
                <div style={{ width:"7px",height:"7px",borderRadius:"2px",background:color,flexShrink:0 }}/>
                {c}
                {selectedClients.size > 1 && (
                  <button onClick={()=>toggleClient(c)} style={{ background:"none",border:"none",color:color,cursor:"pointer",padding:"0",fontSize:"13px",lineHeight:1,marginLeft:"2px",opacity:0.7 }}>×</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* LEGEND */}
      <div style={{ display:"flex",gap:"16px",marginBottom:"12px",flexWrap:"wrap",alignItems:"center" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"5px" }}><div style={{ width:"24px",height:"10px",borderRadius:"3px",background:"#1a2744" }}/><span style={{ fontSize:"11px",color:"#6e6e88" }}>Fim de semana</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:"5px" }}><div style={{ width:"10px",height:"10px",borderRadius:"3px",background:"#ef4444" }}/><span style={{ fontSize:"11px",color:"#6e6e88" }}>Feriado</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:"5px" }}><div style={{ width:"10px",height:"10px",borderRadius:"3px",background:"#22d3a0" }}/><span style={{ fontSize:"11px",color:"#6e6e88" }}>Férias</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:"5px" }}><div style={{ width:"10px",height:"10px",borderRadius:"3px",background:"#6e6e88" }}/><span style={{ fontSize:"11px",color:"#6e6e88" }}>Reservado</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:"5px" }}><div style={{ width:"10px",height:"10px",borderRadius:"3px",background:"#6e6e88" }}/><span style={{ fontSize:"11px",color:"#6e6e88" }}>Bloqueado</span></div>
      </div>

      {/* TABLE */}
      <div style={{ overflowX:"auto",borderRadius:"12px",border:"1px solid #2a2a3a" }}>
        <table style={{ borderCollapse:"collapse",width:"100%",minWidth:(daysInMonth*34+160)+"px" }}>
          <thead>
            {/* Weekday row */}
            <tr style={{ background:"#18181f" }}>
              <th style={{ padding:"8px 16px",textAlign:"left",fontSize:"11px",fontWeight:700,color:"#6e6e88",position:"sticky",left:0,background:"#18181f",zIndex:2,minWidth:"150px",borderBottom:"1px solid #0d0d14" }}>Consultor</th>
              {allDays.map(d=>{
                const dow = getDayOfWeek(d);
                const isWeekend = dow === 0 || dow === 6;
                return (
                  <th key={d} style={{ padding:"3px 2px",textAlign:"center",fontSize:"9px",fontWeight:600,color:isWeekend?"#6e6e88":"#6e6e88",minWidth:"34px",maxWidth:"34px",background:isWeekend?"#0d1a30":"#18181f",borderBottom:"1px solid #0d0d14",borderLeft:"1px solid #0d0d14" }}>
                    {WEEKDAY_LABELS[dow]}
                  </th>
                );
              })}
            </tr>
            {/* Day number row */}
            <tr style={{ background:"#18181f" }}>
              <th style={{ padding:"4px 16px",position:"sticky",left:0,background:"#18181f",zIndex:2,borderBottom:"1px solid #2a2a3a" }}></th>
              {allDays.map(d=>{
                const dow = getDayOfWeek(d);
                const isWeekend = dow === 0 || dow === 6;
                const ferNac = getFeriadoNacional(d, monthNum, guessYear);
                return (
                  <th key={d} title={ferNac||undefined} style={{ padding:"4px 2px",textAlign:"center",fontSize:"11px",fontWeight:700,color:ferNac?"#f59e0b":isWeekend?"#374151":"#6e6e88",minWidth:"34px",background:ferNac?"#f59e0b18":isWeekend?"#0d1a30":"#18181f",borderBottom:"1px solid #2a2a3a",borderLeft:"1px solid #0d0d14",position:"relative" }}>
                    {ferNac && <span style={{ position:"absolute",top:"1px",left:"50%",transform:"translateX(-50%)",fontSize:"6px",color:"#f59e0b" }}>★</span>}
                    {d}
                  </th>
                );
              })}
            </tr>
            {/* Feriados nacionais row */}
            <tr style={{ background:"#18181f" }}>
              <th style={{ padding:"3px 16px",position:"sticky",left:0,background:"#18181f",zIndex:2,borderBottom:"1px solid #2a2a3a",fontSize:"9px",color:"#f59e0b",fontWeight:700 }}>🇧🇷 Feriados</th>
              {allDays.map(d=>{
                const ferNac = getFeriadoNacional(d, monthNum, guessYear);
                return (
                  <td key={d} title={ferNac||undefined} style={{ padding:"2px",textAlign:"center",background:ferNac?"#f59e0b15":"#18181f",borderLeft:"1px solid #0d0d14",borderBottom:"1px solid #2a2a3a" }}>
                    {ferNac && <div style={{ fontSize:"7px",fontWeight:700,color:"#f59e0b",lineHeight:1.2,maxWidth:"32px",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",margin:"0 auto" }} title={ferNac}>🎉</div>}
                  </td>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {activeConsultores.map((name)=>(
              <tr key={name} style={{ borderTop:"1px solid #18181f" }}>
                <td style={{ padding:"6px 16px",fontSize:"12px",fontWeight:600,color:"#2a2a3a",position:"sticky",left:0,background:"#0d0d14",zIndex:1,whiteSpace:"nowrap",borderRight:"1px solid #2a2a3a" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                    <div style={{ width:"22px",height:"22px",borderRadius:"50%",background:"hsl("+(consultores.indexOf(name)*29%360)+",65%,50%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",fontWeight:700,color:"#fff",flexShrink:0 }}>{getInitials(name)}</div>
                    {name.trim().split(" ").slice(0,2).join(" ")}
                  </div>
                </td>
                {allDays.map(d=>{
                  const dow = getDayOfWeek(d);
                  const isWeekend = dow === 0 || dow === 6;
                  const entry = lookup[name]?.[d];
                  const colBg = isWeekend ? "#0d1a30" : "#0d0d14";

                  const dayEntries = lookup[name]?.[d] || [];
                  if (dayEntries.length === 0) return (
                    <td key={d} style={{ padding:"3px",borderLeft:"1px solid #18181f",background:colBg }}
                      onClick={e=>{ if(readonly) return; e.stopPropagation(); onNewEntry({ consultor:name, month:calMes, day:d }); }}>
                      <div style={{ width:"28px",height:"28px",borderRadius:"4px",background:"transparent",border:"1px dashed transparent",margin:"0 auto",cursor:readonly?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s" }}
                        onMouseEnter={e=>{ if(readonly) return; e.currentTarget.style.background="#22d3a018"; e.currentTarget.style.borderColor="#22c55e55"; e.currentTarget.querySelector("span").style.opacity="1"; }}
                        onMouseLeave={e=>{ if(readonly) return; e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="transparent"; e.currentTarget.querySelector("span").style.opacity="0"; }}>
                        <span style={{ fontSize:"13px",opacity:0,transition:"opacity 0.15s",userSelect:"none",color:"#22d3a0" }}>＋</span>
                      </div>
                    </td>
                  );
                  const allFiltered = dayEntries.every(e=>e.type==="client"&&clientFilterActive&&!selectedClients.has(normalizeClient(e.client)));
                  return (
                    <td key={d} style={{ padding:"2px",borderLeft:"1px solid #18181f",background:colBg,verticalAlign:"top" }} onClick={e=>{e.stopPropagation();if(!allFiltered)openPopup({name,day:d,entries:dayEntries},e.clientX,e.clientY);}}>
                      <div style={{ width:"28px",minHeight:"28px",borderRadius:"4px",overflow:"hidden",margin:"0 auto",cursor:allFiltered?"default":"pointer",display:"flex",flexDirection:"column",gap:"1px" }}>
                        {dayEntries.slice(0,3).map((entry,ei)=>{
                          const color=getColor(entry);
                          const label=entry.type==="vacation"?"FÉR":entry.type==="holiday"?"FER":entry.type==="blocked"?"BLQ":entry.type==="reserved"?"RES":normalizeClient(entry.client).slice(0,3);
                          const filtered=entry.type==="client"&&clientFilterActive&&!selectedClients.has(normalizeClient(entry.client));
                          const osAprov = entry.osStatus==="aprovada" && !!entry.osAvaliadoPor;
                          const temOS = !!entry.osNumero;
                          return (
                            <div key={entry.id||ei}
                              title={temOS ? `${entry.client} · ${entry.osNumero}${osAprov?" ✅ Aprovada":""}` : entry.client}
                              style={{ flex:1,background:filtered?"#18181f":color,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"8px",opacity:filtered?0.2:osAprov?0.45:1,position:"relative" }}>
                              {!filtered&&dayEntries.length<=2&&<span style={{ fontSize:"6px",fontWeight:800,color:"#fff",letterSpacing:"-0.5px" }}>{label}</span>}
                              {temOS&&!filtered&&<span style={{ position:"absolute",top:0,left:0,width:"5px",height:"5px",borderRadius:"50%",background:osAprov?"#22d3a0":"#fff",opacity:0.9 }}/>}
                              {osAprov&&!filtered&&<span style={{ position:"absolute",bottom:0,right:0,fontSize:"5px",lineHeight:1 }}>🔒</span>}
                            </div>
                          );
                        })}
                        {dayEntries.length>3&&<div style={{ background:"#0d0d14",display:"flex",alignItems:"center",justifyContent:"center",minHeight:"7px" }}><span style={{ fontSize:"6px",color:"#6e6e88",fontWeight:700 }}>+{dayEntries.length-3}</span></div>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize:"11px",color:"#6e6e88",marginTop:"8px" }}>💡 Clique em célula colorida para editar/excluir · Clique em célula vazia para adicionar agenda · Colunas escuras = fim de semana</p>
      {popup && (
        <div onClick={e=>e.stopPropagation()} style={{ position:"fixed",left:popupPos.x+"px",top:popupPos.y+"px",background:"#18181f",border:"1px solid #6e6e88",borderRadius:"12px",zIndex:9000,width:"280px",boxShadow:"0 8px 32px rgba(0,0,0,0.6)",maxHeight:"80vh",display:"flex",flexDirection:"column" }}>
          {/* Header fixo + drag */}
          <div onMouseDown={startDrag} style={{ padding:"14px 16px 10px",borderBottom:"1px solid #2a2a3a",flexShrink:0,cursor:"grab",userSelect:"none" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:"13px",fontWeight:700,color:"#f0f0fa" }}>{popup.name.trim().split(" ")[0]}</div>
                <div style={{ fontSize:"11px",color:"#6e6e88" }}>Dia {popup.day} · {calMes} {calAno} ({WEEKDAY_LABELS[getDayOfWeek(popup.day)]})</div>
              </div>
              <div style={{ display:"flex",gap:"6px",alignItems:"center" }}>
                {!readonly && <button onMouseDown={e=>e.stopPropagation()} onClick={()=>{ onNewEntry({consultor:popup.name,month:calMes,day:popup.day}); setPopup(null); }} style={{ padding:"4px 8px",borderRadius:"6px",border:"1px solid #22c55e44",background:"#22d3a018",color:"#22d3a0",fontSize:"11px",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" }}>＋ Novo</button>}
                <button onMouseDown={e=>e.stopPropagation()} onClick={()=>setPopup(null)} style={{ background:"#2a2a3a",border:"none",color:"#6e6e88",borderRadius:"8px",width:"28px",height:"28px",cursor:"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>✕</button>
              </div>
            </div>
          </div>
          {/* Entry list com scroll */}
          <div style={{ display:"flex",flexDirection:"column",gap:"8px",overflowY:"auto",padding:"12px 16px 16px",maxHeight:"calc(80vh - 70px)" }}>
            {(popup.entries||[]).map((entry,ei)=>{
              const color = getColor(entry);
              const TYPE_LABEL = {client:"👤 Cliente",vacation:"🏖 Férias",holiday:"🎉 Feriado",reserved:"🔒 Reservado",blocked:"⛔ Bloqueado"};
              return (
                <div key={entry.id||ei} style={{ background:"#0d0d14",borderRadius:"8px",border:"1px solid #2a2a3a",overflow:"hidden" }}>
                  {/* Entry header bar */}
                  <div style={{ background:color,padding:"4px 10px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <span style={{ fontSize:"11px",fontWeight:800,color:"#fff",letterSpacing:"0.3px" }}>{entry.client||TYPE_LABEL[entry.type]||entry.type}</span>
                    <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
                      {entry.modalidade && <span title={entry.modalidade==="presencial"?"Presencial":"Remoto"} style={{ fontSize:"11px" }}>{entry.modalidade==="remoto"?"💻":"🏢"}</span>}
                      {(entry.horaInicio||entry.horaFim) && <span style={{ fontSize:"10px",color:"rgba(255,255,255,0.85)",fontWeight:600 }}>{entry.horaInicio||""}{entry.horaFim?" → "+entry.horaFim:""}{entry.intervalo?" ☕"+entry.intervalo+"m":""}</span>}
                    </div>
                  </div>
                  {entry.atividades && (
                    <div style={{ padding:"6px 10px 0",fontSize:"11px",color:"#6e6e88",lineHeight:"1.5",whiteSpace:"pre-wrap",borderBottom:"1px solid #18181f" }}>{entry.atividades}</div>
                  )}
                  {/* History */}
                  <div style={{ padding:"8px 10px" }}>
                    {(entry.historico||[]).length>0 ? (
                      <div style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
                        {entry.historico.map((h,hi)=>(
                          <div key={hi} style={{ fontSize:"10px",color:"#6e6e88" }}>
                            <span style={{ color:h.acao==="criado"?"#22c55e":h.acao==="alterado"?"#f59e0b":"#ef4444",marginRight:"4px" }}>{h.acao==="criado"?"＋":h.acao==="alterado"?"✎":"✕"}</span>
                            <span style={{ color:"#6e6e88",fontWeight:600 }}>{h.por}</span>
                            <span style={{ color:"#6e6e88" }}> · {formatDateTime(h.em)}</span>
                            {h.alteracoes&&h.alteracoes.length>0&&(
                              <div style={{ marginTop:"2px",paddingLeft:"14px" }}>
                                {h.alteracoes.map((a,ai)=>(
                                  <div key={ai} style={{ fontSize:"9px",color:"#6e6e88" }}>
                                    <span style={{ color:"#6e6e88" }}>{a.campo}:</span> <span style={{ textDecoration:"line-through",color:"#ef444488" }}>{a.de}</span> → <span style={{ color:"#22d3a0" }}>{a.para}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize:"10px",color:"#6e6e88",fontStyle:"italic" }}>Sem histórico</span>
                    )}
                    {/* OS aprovada — número + badge */}
                    {(()=>{
                      const osAprov = entry.osStatus==="aprovada" && !!entry.osAvaliadoPor;
                      return (
                        <>
                          {entry.osNumero && (
                            <div style={{ display:"flex",alignItems:"center",gap:"6px",marginTop:"6px",marginBottom:"2px" }}>
                              <span style={{ fontSize:"10px",fontWeight:700,color:"#22d3a0" }}>📋 OS {entry.osNumero}</span>
                              {osAprov && <span style={{ fontSize:"9px",padding:"1px 7px",borderRadius:"99px",background:"#22d3a018",border:"1px solid #22d3a033",color:"#22d3a0",fontWeight:700 }}>✅ Aprovada</span>}
                            </div>
                          )}
                          {osAprov && (
                            <div style={{ fontSize:"10px",color:"#6e6e88",marginTop:"4px",padding:"4px 8px",background:"#22d3a00a",borderRadius:"6px",border:"1px solid #22d3a020" }}>
                              🔒 Aprovada por <strong style={{ color:"#a0a0b0" }}>{entry.osAvaliadoPor}</strong> — somente leitura
                            </div>
                          )}
                          {/* Actions */}
                          <div style={{ display:"flex",gap:"6px",marginTop:"8px",flexWrap:"wrap" }}>
                            {onOsClick && !osAprov && (
                              <button onClick={()=>{ onOsClick({...entry,consultor:popup.name,month:calMes}); setPopup(null); }}
                                style={{ flex:1,padding:"5px 8px",borderRadius:"5px",border:"1px solid #22d3a044",background:"#22d3a015",color:"#22d3a0",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>📋 OS</button>
                            )}
                            {!readonly && !osAprov && (
                              <>
                                <button onClick={()=>{ onEdit({...entry,consultor:popup.name,month:calMes}); setPopup(null); }} style={{ flex:1,padding:"5px",borderRadius:"5px",border:"none",background:"#6c63ff",color:"#fff",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>✏️ Editar</button>
                                <button onClick={()=>{ onDelete(popup.name,entry.id); setPopup(null); }} style={{ padding:"5px 10px",borderRadius:"5px",border:"1px solid #ef4444",background:"transparent",color:"#ef4444",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>🗑</button>
                              </>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTOR CARD
// ─────────────────────────────────────────────────────────────────────────────
function ConsultorCard({ name, entries, idx, onClick, selected }) {
  const clientEntries = entries.filter(e=>e.type==="client");
  const clientCounts = {};
  clientEntries.forEach(e=>{ const k=normalizeClient(e.client); clientCounts[k]=(clientCounts[k]||0)+1; });
  const topClients = Object.entries(clientCounts).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const total = clientEntries.length;
  const vacation = entries.filter(e=>e.type==="vacation").length;
  const hue = (idx * 47) % 360;
  const avatarGrad = `linear-gradient(135deg,hsl(${hue},65%,55%),hsl(${(hue+40)%360},70%,45%))`;
  return (
    <div onClick={onClick} className="card-hover" style={{ background:selected?"#16102a":"#111118",border:"1px solid "+(selected?"#6c63ff66":"#1f1f2e"),borderRadius:"16px",padding:"20px 22px",cursor:"pointer",position:"relative",overflow:"hidden" }}>
      {selected && <div style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,#6c63ff08,#a78bfa05)",pointerEvents:"none" }}/>}
      {/* Accent line top */}
      {selected && <div style={{ position:"absolute",top:0,left:0,right:0,height:"2px",background:"linear-gradient(90deg,#6c63ff,#a78bfa)" }}/>}
      <div style={{ display:"flex",alignItems:"center",gap:"13px",marginBottom:"16px" }}>
        <div style={{ width:"44px",height:"44px",borderRadius:"14px",background:avatarGrad,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"14px",color:"#fff",flexShrink:0,boxShadow:`0 4px 12px hsl(${hue},60%,50%)44` }}>{getInitials(name)}</div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontWeight:700,fontSize:"15px",color:"#f0f0fa",letterSpacing:"-0.2px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{name.trim()}</div>
          <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"3px",display:"flex",gap:"10px" }}>
            <span style={{ display:"flex",alignItems:"center",gap:"4px" }}><span style={{ color:"#22d3a0",fontWeight:700 }}>{total}</span> dias cliente</span>
            {vacation>0 && <span style={{ display:"flex",alignItems:"center",gap:"4px" }}><span style={{ color:"#a78bfa",fontWeight:700 }}>{vacation}</span> férias</span>}
          </div>
        </div>
        {selected && <div style={{ width:"8px",height:"8px",borderRadius:"50%",background:"#6c63ff",boxShadow:"0 0 8px #6c63ff" }}/>}
      </div>
      {topClients.length>0 && (
        <div style={{ display:"flex",flexDirection:"column",gap:"7px" }}>
          {topClients.map(([client,count])=>{
            const pct = Math.round((count/total)*100);
            const color = getClientColor(client);
            return (
              <div key={client}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px",alignItems:"center" }}>
                  <span style={{ fontSize:"11px",color:"#8888a8",fontWeight:500,letterSpacing:"0.2px" }}>{client}</span>
                  <span style={{ fontSize:"10px",color:"#4e4e66",fontWeight:600 }}>{pct}%</span>
                </div>
                <div style={{ height:"4px",background:"#1f1f2e",borderRadius:"99px",overflow:"hidden" }}>
                  <div style={{ height:"100%",width:pct+"%",background:`linear-gradient(90deg,${color},${color}bb)`,borderRadius:"99px",transition:"width .4s" }}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR VIEW (single consultant)
// ─────────────────────────────────────────────────────────────────────────────
function CalendarView({ consultant, month, byDay }) {
  const [weekIdx, setWeekIdx] = React.useState(0);
  const [popup, setPopup] = React.useState(null); // { day, entries, x, y }
  const [popupPos, setPopupPos] = React.useState({x:0,y:0});
  const startDrag = React.useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX - popupPos.x, startY = e.clientY - popupPos.y;
    const onMove = (ev) => setPopupPos({ x: ev.clientX - startX, y: ev.clientY - startY });
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [popupPos]);
  const openPopupCV = React.useCallback((data, x, y) => {
    setPopupPos({ x: Math.min(x+8, window.innerWidth-300), y: Math.min(y+8, window.innerHeight-340) });
    setPopup(data);
  }, []);
  const wd = ["Seg","Ter","Qua","Qui","Sex","Sab","Dom"];
  const WD_FULL = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];
  const TYPE_LABEL = {client:"👤 Cliente",vacation:"🏖 Férias",holiday:"🎉 Feriado",reserved:"🔒 Reservado",blocked:"⛔ Bloqueado"};

  // Infer year from entries or use current year
  const entryValues = Object.values(byDay||{}).flat();
  const year = (entryValues[0]?.year) || new Date().getFullYear();

  // Build month grid aligned to correct weekday
  const monthIdx = MONTHS_ORDER.indexOf(month);
  const firstDayRaw = monthIdx >= 0 ? new Date(year, monthIdx, 1).getDay() : 1;
  const offset = (firstDayRaw + 6) % 7; // Mon=0 … Sun=6
  const daysInMonth = monthIdx >= 0 ? new Date(year, monthIdx + 1, 0).getDate() : 31;

  const slots = [];
  for (let i = 0; i < offset; i++) slots.push(null);
  for (let d = 1; d <= daysInMonth; d++) slots.push(d);
  while (slots.length % 7 !== 0) slots.push(null);

  const weeks = [];
  for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7));
  const totalWeeks = weeks.length;
  const wi = Math.min(weekIdx, totalWeeks - 1);
  const currentWeek = weeks[wi] || [];

  const firstDay = currentWeek.find(d => d !== null);
  const lastDay = [...currentWeek].reverse().find(d => d !== null);
  const weekLabel = firstDay && lastDay ? firstDay === lastDay ? `Dia ${firstDay}` : `${firstDay} – ${lastDay} de ${month}` : month;

  const getColor = e => e.type==="vacation"?"#22c55e":e.type==="absence"?"#f04f5e":e.type==="holiday"?"#ef4444":e.type==="reserved"?"#6e6e88":e.type==="blocked"?"#6e6e88":getClientColor(e.client);

  return (
    <div onClick={()=>setPopup(null)}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",gap:"16px",marginBottom:"20px",flexWrap:"wrap" }}>
        <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:700,color:"#f0f0fa",margin:0 }}>📅 {consultant} — {month} {year}</h2>
        <div style={{ display:"flex",alignItems:"center",gap:"6px",background:"#18181f",borderRadius:"10px",padding:"4px 6px",border:"1px solid #2a2a3a" }}>
          <button onClick={()=>setWeekIdx(w=>Math.max(0,w-1))} disabled={wi===0}
            style={{ background:"none",border:"none",color:wi===0?"#2a2a3a":"#6e6e88",cursor:wi===0?"default":"pointer",fontWeight:700,fontSize:"16px",padding:"2px 8px",lineHeight:1 }}>‹</button>
          <span style={{ fontSize:"12px",fontWeight:600,color:"#6e6e88",minWidth:"120px",textAlign:"center" }}>{weekLabel}</span>
          <button onClick={()=>setWeekIdx(w=>Math.min(totalWeeks-1,w+1))} disabled={wi===totalWeeks-1}
            style={{ background:"none",border:"none",color:wi===totalWeeks-1?"#2a2a3a":"#6e6e88",cursor:wi===totalWeeks-1?"default":"pointer",fontWeight:700,fontSize:"16px",padding:"2px 8px",lineHeight:1 }}>›</button>
        </div>
        <span style={{ fontSize:"12px",color:"#6e6e88" }}>Semana {wi+1} de {totalWeeks}</span>
      </div>

      {/* Week grid */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"10px" }}>
        {wd.map((d,i)=>(
          <div key={d} style={{ textAlign:"center",fontSize:"11px",fontWeight:700,color:"#6e6e88",padding:"8px 0",borderBottom:"1px solid #18181f" }}>
            <div>{d}</div>
            <div style={{ fontSize:"10px",fontWeight:400,color:"#2a2a3a",marginTop:"2px" }}>{WD_FULL[i]}</div>
          </div>
        ))}
        {currentWeek.map((day,i)=>{
          if (!day) return <div key={"e"+i} style={{ minHeight:"140px",borderRadius:"10px",background:"#0d0d1444" }}/>;
          const entries = Array.isArray(byDay[day]) ? byDay[day] : (byDay[day] ? [byDay[day]] : []);
          const isToday = (() => { const t=new Date(); return t.getDate()===day && t.getMonth()===monthIdx && t.getFullYear()===year; })();
          const ferNac = getFeriadoNacional(day, monthIdx+1, year);
          return (
            <div key={day} onClick={e=>e.stopPropagation()} style={{ minHeight:"140px",borderRadius:"10px",background:ferNac?"#1a1408":isToday?"#16102a":"#18181f",border:"1px solid "+(ferNac?"#f59e0b44":isToday?"#3b82f6":"#2a2a3a"),padding:"10px",display:"flex",flexDirection:"column",gap:"6px" }}>
              <div style={{ fontSize:"18px",fontWeight:700,color:ferNac?"#f59e0b":isToday?"#60a5fa":"#f0f0fa",marginBottom:"2px" }}>{day}</div>
              {ferNac && <div style={{ fontSize:"9px",fontWeight:700,color:"#f59e0b",background:"#f59e0b18",borderRadius:"4px",padding:"2px 6px",marginBottom:"2px" }}>🎉 {ferNac}</div>}
              {entries.length===0 && <div style={{ fontSize:"11px",color:"#2a2a3a",fontStyle:"italic" }}>—</div>}
              {entries.map((entry,ei)=>{
                const color = getColor(entry);
                return (
                  <div key={ei} onClick={e=>{ e.stopPropagation(); openPopupCV({day,entries},e.clientX,e.clientY); }}
                    style={{ background:color+"22",border:"1px solid "+color+"55",borderRadius:"6px",padding:"6px 8px",cursor:"pointer",transition:"filter .1s" }}
                    onMouseEnter={e=>e.currentTarget.style.filter="brightness(1.2)"}
                    onMouseLeave={e=>e.currentTarget.style.filter=""}>
                    <div style={{ fontSize:"11px",fontWeight:700,color:color,lineHeight:1.3 }}>{entry.client||TYPE_LABEL[entry.type]||entry.type}</div>
                    {(entry.horaInicio||entry.horaFim) && (
                      <div style={{ fontSize:"10px",color:"#6e6e88",marginTop:"2px" }}>{entry.horaInicio||""}{entry.horaFim?" – "+entry.horaFim:""}</div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* POPUP — detail view on entry click */}
      {popup && (
        <div onClick={e=>e.stopPropagation()}
          style={{ position:"fixed",left:popupPos.x+"px",top:popupPos.y+"px",background:"#18181f",border:"1px solid #6e6e88",borderRadius:"12px",zIndex:9000,width:"290px",boxShadow:"0 8px 32px rgba(0,0,0,0.6)",maxHeight:"80vh",display:"flex",flexDirection:"column" }}>
          {/* Header fixo + drag */}
          <div onMouseDown={startDrag} style={{ padding:"14px 16px 12px",borderBottom:"1px solid #2a2a3a",flexShrink:0,cursor:"grab",userSelect:"none" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ fontSize:"13px",fontWeight:700,color:"#f0f0fa" }}>{consultant.trim().split(" ")[0]}</div>
                <div style={{ fontSize:"11px",color:"#6e6e88" }}>Dia {popup.day} · {month} {year} ({WD_FULL[(new Date(year,monthIdx,popup.day).getDay()+6)%7]})</div>
              </div>
              <button onMouseDown={e=>e.stopPropagation()} onClick={()=>setPopup(null)} style={{ background:"#2a2a3a",border:"none",color:"#6e6e88",borderRadius:"8px",width:"28px",height:"28px",cursor:"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>✕</button>
            </div>
          </div>
          {/* Entries com scroll */}
          <div style={{ display:"flex",flexDirection:"column",gap:"8px",overflowY:"auto",padding:"12px 16px 16px",maxHeight:"calc(80vh - 70px)" }}>
            {(popup.entries||[]).map((entry,ei)=>{
              const color = getColor(entry);
              return (
                <div key={entry.id||ei} style={{ background:"#0d0d14",borderRadius:"8px",border:"1px solid #2a2a3a",overflow:"hidden" }}>
                  {/* Color bar header */}
                  <div style={{ background:color,padding:"6px 10px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <span style={{ fontSize:"12px",fontWeight:800,color:"#fff" }}>{entry.client||TYPE_LABEL[entry.type]||entry.type}</span>
                    <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
                      {entry.modalidade && <span title={entry.modalidade==="presencial"?"Presencial":"Remoto"} style={{ fontSize:"12px" }}>{entry.modalidade==="remoto"?"💻":"🏢"}</span>}
                      {(entry.horaInicio||entry.horaFim) && (
                        <span style={{ fontSize:"10px",color:"rgba(255,255,255,0.85)",fontWeight:600 }}>
                          {entry.horaInicio||""}{entry.horaFim?" → "+entry.horaFim:""}{entry.intervalo?" ☕"+entry.intervalo+"m":""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ padding:"8px 10px",display:"flex",flexDirection:"column",gap:"6px" }}>
                    {/* Type badge + modalidade */}
                    <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                      <div style={{ fontSize:"11px",color:"#6e6e88" }}>{TYPE_LABEL[entry.type]||entry.type}</div>
                      {entry.modalidade && (
                        <div style={{ fontSize:"11px",fontWeight:600,padding:"2px 8px",borderRadius:"20px",
                          background:entry.modalidade==="remoto"?"#6366f122":"#10b98122",
                          color:entry.modalidade==="remoto"?"#818cf8":"#10b981"
                        }}>{entry.modalidade==="remoto"?"💻 Remoto":"🏢 Presencial"}</div>
                      )}
                    </div>
                    {/* Horário detail */}
                    {(entry.horaInicio||entry.horaFim||entry.intervalo) && (
                      <div style={{ background:"#18181f",borderRadius:"6px",padding:"6px 8px",fontSize:"11px",color:"#6e6e88",display:"flex",gap:"12px",flexWrap:"wrap" }}>
                        {entry.horaInicio && <span>🕐 Início: <strong style={{ color:"#f0f0fa" }}>{entry.horaInicio}</strong></span>}
                        {entry.horaFim && <span>🕔 Fim: <strong style={{ color:"#f0f0fa" }}>{entry.horaFim}</strong></span>}
                        {entry.intervalo && <span>☕ Intervalo: <strong style={{ color:"#f0f0fa" }}>{entry.intervalo}min</strong></span>}
                      </div>
                    )}
                    {/* Atividades */}
                    {entry.atividades && (
                      <div style={{ background:"#18181f",borderRadius:"6px",padding:"6px 8px" }}>
                        <div style={{ fontSize:"10px",fontWeight:700,color:"#6e6e88",marginBottom:"3px",textTransform:"uppercase",letterSpacing:"0.5px" }}>Atividades</div>
                        <div style={{ fontSize:"11px",color:"#6e6e88",lineHeight:"1.6",whiteSpace:"pre-wrap" }}>{entry.atividades}</div>
                      </div>
                    )}
                    {/* Histórico */}
                    {(entry.historico||[]).length>0 && (
                      <div style={{ borderTop:"1px solid #18181f",paddingTop:"6px" }}>
                        <div style={{ fontSize:"10px",fontWeight:700,color:"#6e6e88",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.5px" }}>Histórico</div>
                        {entry.historico.map((h,hi)=>(
                          <div key={hi} style={{ fontSize:"10px",color:"#6e6e88",marginBottom:"3px" }}>
                            <span style={{ color:h.acao==="criado"?"#22c55e":h.acao==="alterado"?"#f59e0b":"#ef4444",marginRight:"4px" }}>{h.acao==="criado"?"＋":h.acao==="alterado"?"✎":"✕"}</span>
                            <span style={{ color:"#6e6e88",fontWeight:600 }}>{h.por}</span>
                            <span style={{ color:"#6e6e88" }}> · {formatDateTime(h.em)}</span>
                            {h.alteracoes&&h.alteracoes.length>0&&(
                              <div style={{ marginTop:"2px",paddingLeft:"14px" }}>
                                {h.alteracoes.map((a,ai)=>(
                                  <div key={ai} style={{ fontSize:"9px",color:"#6e6e88" }}>
                                    <span style={{ color:"#6e6e88" }}>{a.campo}:</span> <span style={{ textDecoration:"line-through",color:"#ef444488" }}>{a.de}</span> → <span style={{ color:"#22d3a0" }}>{a.para}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE VIEW
// ─────────────────────────────────────────────────────────────────────────────
function TimelineView({ data, months }) {
  const consultores = Object.keys(data).filter(c=>data[c].length>0);
  const displayMonths = months.slice(0,12);
  const getMonthSummary = (name,month) => {
    const entries = (data[name]||[]).filter(e=>e.month.toUpperCase()===month.toUpperCase());
    const byClient = {};
    entries.filter(e=>e.type==="client").forEach(e=>{ const k=normalizeClient(e.client); byClient[k]=(byClient[k]||0)+1; });
    const top = Object.entries(byClient).sort((a,b)=>b[1]-a[1])[0];
    return { total:Object.values(byClient).reduce((s,v)=>s+v,0), top, vacation:entries.filter(e=>e.type==="vacation").length, absence:entries.filter(e=>e.type==="absence").length };
  };
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ borderCollapse:"collapse",minWidth:"900px",width:"100%" }}>
        <thead>
          <tr>
            <th style={{ padding:"10px 16px",textAlign:"left",fontSize:"12px",fontWeight:700,color:"#6e6e88",position:"sticky",left:0,background:"#0d0d14",zIndex:1 }}>Consultor</th>
            {displayMonths.map(m=><th key={m} style={{ padding:"10px 8px",textAlign:"center",fontSize:"11px",fontWeight:600,color:"#6e6e88",minWidth:"80px" }}>{m.slice(0,3)}</th>)}
          </tr>
        </thead>
        <tbody>
          {consultores.map((name,idx)=>(
            <tr key={name} style={{ borderTop:"1px solid #18181f" }}>
              <td style={{ padding:"10px 16px",fontSize:"13px",fontWeight:600,color:"#2a2a3a",position:"sticky",left:0,background:"#0d0d14",zIndex:1,whiteSpace:"nowrap" }}>
                <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                  <div style={{ width:"28px",height:"28px",borderRadius:"50%",background:"hsl("+(idx*29%360)+",65%,50%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:700,color:"#fff",flexShrink:0 }}>{getInitials(name)}</div>
                  {name.trim().split(" ").slice(0,2).join(" ")}
                </div>
              </td>
              {displayMonths.map(m=>{
                const {total,top,vacation,absence} = getMonthSummary(name,m);
                if (absence>0&&total===0) return <td key={m} style={{ padding:"4px" }}><div style={{ background:"#f04f5e22",border:"1px solid #f04f5e44",borderRadius:"6px",padding:"6px 4px",textAlign:"center" }}><div style={{ fontSize:"10px",color:"#f04f5e",fontWeight:600 }}>AFASTADO</div></div></td>;
                if (vacation>0&&total===0) return <td key={m} style={{ padding:"4px" }}><div style={{ background:"#22c55e22",border:"1px solid #22c55e44",borderRadius:"6px",padding:"6px 4px",textAlign:"center" }}><div style={{ fontSize:"10px",color:"#22d3a0",fontWeight:600 }}>FÉRIAS</div></div></td>;
                if (!total) return <td key={m} style={{ padding:"4px" }}><div style={{ height:"36px",borderRadius:"6px",background:"#18181f44" }}/></td>;
                const color = top ? getClientColor(top[0]) : "#3b82f6";
                return <td key={m} style={{ padding:"4px" }}><div style={{ background:color+"22",border:"1px solid "+color+"44",borderRadius:"6px",padding:"6px 4px",textAlign:"center" }}><div style={{ fontSize:"9px",color:color,fontWeight:700,lineHeight:1.2 }}>{top?.[0]?.slice(0,7)||""}</div><div style={{ fontSize:"10px",color:"#6e6e88",marginTop:"1px" }}>{total}d</div></div></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function StatsView({ stats }) {
  const maxDays = Math.max(...stats.consultorStats.map(c=>c.working),1);
  return (
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px" }}>
      <div style={{ background:"#18181f",borderRadius:"12px",padding:"24px",border:"1px solid #2a2a3a" }}>
        <h3 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"15px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"20px" }}>🏆 Top Clientes por Dias</h3>
        <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
          {stats.topClients.map(([client,days],i)=>{
            const color = getClientColor(client);
            const pct = Math.round((days/(stats.topClients[0]?.[1]||1))*100);
            return (
              <div key={client}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px" }}>
                  <span style={{ fontSize:"13px",color:"#2a2a3a",fontWeight:500 }}><span style={{ color:"#6e6e88",marginRight:"8px" }}>#{i+1}</span>{client}</span>
                  <span style={{ fontSize:"13px",color:color,fontWeight:700 }}>{days} dias</span>
                </div>
                <div style={{ height:"6px",background:"#2a2a3a",borderRadius:"3px",overflow:"hidden" }}>
                  <div style={{ height:"100%",width:pct+"%",background:color,borderRadius:"3px" }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ background:"#18181f",borderRadius:"12px",padding:"24px",border:"1px solid #2a2a3a" }}>
        <h3 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"15px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"20px" }}>👥 Produtividade por Consultor</h3>
        <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
          {stats.consultorStats.filter(c=>c.working>0).map((c,i)=>{
            const pct = Math.round((c.working/maxDays)*100);
            const hue = (i*37)%360;
            return (
              <div key={c.name}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"3px" }}>
                  <span style={{ fontSize:"12px",color:"#2a2a3a" }}>{c.name.trim().split(" ").slice(0,2).join(" ")}</span>
                  <div style={{ display:"flex",gap:"8px" }}>
                    <span style={{ fontSize:"12px",color:"#6e6e88" }}>{c.working}d</span>
                    {c.vacation>0&&<span style={{ fontSize:"12px",color:"#22d3a0" }}>🏖 {c.vacation}d</span>}
                  </div>
                </div>
                <div style={{ height:"5px",background:"#2a2a3a",borderRadius:"3px",overflow:"hidden" }}>
                  <div style={{ height:"100%",width:pct+"%",background:"hsl("+hue+",65%,55%)",borderRadius:"3px" }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_BADGES = {
  admin:              { label:"Admin",              color:"#a855f7", bg:"#a855f718", nivel:99 },
  editor:             { label:"Editor",             color:"#6c63ff", bg:"#6c63ff18", nivel:80 },
  viewer:             { label:"Visualizador",       color:"#6e6e88", bg:"#6e6e8818", nivel:10 },
  consultor:          { label:"Consultor",          color:"#f59e0b", bg:"#f59e0b18", nivel:20 },
  diretor_executivo:  { label:"Diretor Executivo",  color:"#ec4899", bg:"#ec489918", nivel:90 },
  diretor:            { label:"Diretor",            color:"#f43f5e", bg:"#f43f5e18", nivel:80 },
  gerente_executivo:  { label:"Gerente Executivo",  color:"#f97316", bg:"#f9731618", nivel:70 },
  gerente:            { label:"Gerente",            color:"#eab308", bg:"#eab30818", nivel:60 },
  coordenador:        { label:"Coordenador",        color:"#22d3a0", bg:"#22d3a018", nivel:50 },
  administrativo:     { label:"Administrativo",     color:"#64748b", bg:"#64748b18", nivel:30 },
};

// ─────────────────────────────────────────────────────────────────────────────
// TELA DE LOGIN (Firebase Auth)
// ─────────────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError("Preencha e-mail e senha."); return; }
    setLoading(true); setError("");
    try {
      await setPersistence(auth, browserLocalPersistence);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const profile = await getUserProfile(cred.user.email);
      if (!profile) { setError("Usuário sem perfil configurado. Contate o administrador."); setLoading(false); return; }
      if (profile.bloqueado) { await signOut(auth); setError("🔒 Acesso bloqueado. Entre em contato com o administrador."); setLoading(false); return; }
      onLogin({ uid: cred.user.uid, email: cred.user.email, ...profile });
    } catch(e) {
      const msgs = { "auth/invalid-credential":"E-mail ou senha incorretos.", "auth/user-not-found":"E-mail não encontrado.", "auth/wrong-password":"Senha incorreta.", "auth/too-many-requests":"Muitas tentativas. Aguarde alguns minutos." };
      setError(msgs[e.code] || "Erro ao fazer login. Tente novamente.");
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!resetEmail.trim()) { setResetMsg("⚠️ Digite seu e-mail."); return; }
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetMsg("✅ E-mail de recuperação enviado!");
    } catch(e) {
      setResetMsg("⚠️ E-mail não encontrado ou erro ao enviar.");
    }
  };

  const inp = { padding:"12px 16px", borderRadius:"12px", border:"1px solid #2a2a3a", background:"#0d0d14", color:"#c8c8d8", fontSize:"14px", width:"100%", boxSizing:"border-box", outline:"none", fontFamily:"inherit", transition:"border-color .15s,box-shadow .15s" };

  return (
    <div style={{ fontFamily:"'Outfit',sans-serif", background:"#09090f", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", position:"relative", overflow:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Cabinet+Grotesk:wght@700;900&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-10px) rotate(2deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes orb{0%,100%{transform:scale(1) translate(0,0)}50%{transform:scale(1.1) translate(10px,-10px)}}
        .login-inp:focus{border-color:#6c63ff!important;box-shadow:0 0 0 3px #6c63ff20!important;}
        .login-btn:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px);box-shadow:0 8px 32px #6c63ff55!important;}
        .login-btn{transition:all .2s cubic-bezier(.4,0,.2,1);}
      `}</style>

      {/* Background orbs */}
      <div style={{ position:"absolute",top:"-160px",left:"-160px",width:"500px",height:"500px",borderRadius:"50%",background:"radial-gradient(circle,#6c63ff1a 0%,transparent 65%)",pointerEvents:"none",animation:"orb 8s ease-in-out infinite" }}/>
      <div style={{ position:"absolute",bottom:"-120px",right:"-100px",width:"400px",height:"400px",borderRadius:"50%",background:"radial-gradient(circle,#a78bfa14 0%,transparent 65%)",pointerEvents:"none",animation:"orb 10s ease-in-out infinite reverse" }}/>
      <div style={{ position:"absolute",top:"40%",right:"10%",width:"200px",height:"200px",borderRadius:"50%",background:"radial-gradient(circle,#22d3a00e 0%,transparent 70%)",pointerEvents:"none" }}/>

      <div style={{ width:"100%", maxWidth:"420px", animation:"fadeUp .45s cubic-bezier(.4,0,.2,1)" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:"40px" }}>
          <div style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:"68px",height:"68px",borderRadius:"20px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",marginBottom:"22px",boxShadow:"0 0 48px #6c63ff55",animation:"float 5s ease-in-out infinite",fontSize:"30px" }}>◈</div>
          <h1 style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:"26px", fontWeight:900, color:"#f0f0fa", margin:"0 0 8px", letterSpacing:"-0.7px" }}>Agenda de Consultores</h1>
          <p style={{ color:"#3e3e55", fontSize:"13px", margin:0, fontWeight:500 }}>Acesse sua conta para continuar</p>
        </div>

        {!showReset ? (
          <div style={{ background:"#111118", borderRadius:"22px", padding:"34px", border:"1px solid #1f1f2e", boxShadow:"0 32px 80px rgba(0,0,0,0.7)" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:"18px" }}>
              <div>
                <label style={{ fontSize:"11px", color:"#3e3e55", fontWeight:700, display:"block", marginBottom:"8px", letterSpacing:"1px", textTransform:"uppercase" }}>E-mail</label>
                <input className="login-inp" type="email" value={email} onChange={e=>{ setEmail(e.target.value); setError(""); }} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder="seu@email.com" style={inp} autoFocus />
              </div>
              <div>
                <label style={{ fontSize:"11px", color:"#3e3e55", fontWeight:700, display:"block", marginBottom:"8px", letterSpacing:"1px", textTransform:"uppercase" }}>Senha</label>
                <div style={{ position:"relative" }}>
                  <input className="login-inp" type={showPass?"text":"password"} value={password} onChange={e=>{ setPassword(e.target.value); setError(""); }} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder="••••••••" style={{...inp, paddingRight:"46px"}} />
                  <button onClick={()=>setShowPass(!showPass)} style={{ position:"absolute", right:"14px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#3e3e55", cursor:"pointer", fontSize:"15px", padding:0 }}>{showPass?"🙈":"👁"}</button>
                </div>
              </div>
              {error && (
                <div style={{ padding:"11px 14px", borderRadius:"11px", background:"#f04f5e12", border:"1px solid #f04f5e30", color:"#f87171", fontSize:"13px", display:"flex",alignItems:"center",gap:"8px" }}>
                  <span>⚠️</span>{error}
                </div>
              )}
              <button className="login-btn" onClick={handleSubmit} disabled={loading}
                style={{ padding:"14px", borderRadius:"12px", border:"none", background:loading?"#1f1f2e":`linear-gradient(135deg,#6c63ff,#a78bfa)`, color:loading?"#3e3e55":"#fff", fontWeight:700, fontSize:"14px", cursor:loading?"not-allowed":"pointer", boxShadow:loading?"none":"0 4px 24px #6c63ff44", marginTop:"4px", fontFamily:"inherit", letterSpacing:"0.3px" }}>
                {loading ? "⏳ Verificando..." : "Entrar →"}
              </button>
              <button onClick={()=>{ setShowReset(true); setResetEmail(email); }}
                style={{ background:"none", border:"none", color:"#3e3e55", fontSize:"12px", cursor:"pointer", padding:0, textAlign:"center", fontFamily:"inherit" }}>
                Esqueci minha senha
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background:"#111118", borderRadius:"22px", padding:"34px", border:"1px solid #1f1f2e", boxShadow:"0 32px 80px rgba(0,0,0,0.7)" }}>
            <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:"18px", fontWeight:900, color:"#f0f0fa", marginTop:0, marginBottom:"8px", letterSpacing:"-0.3px" }}>Recuperar senha</h2>
            <p style={{ fontSize:"13px", color:"#3e3e55", marginBottom:"22px", lineHeight:"1.6" }}>Digite seu e-mail e enviaremos um link para redefinir sua senha.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
              <input className="login-inp" type="email" value={resetEmail} onChange={e=>setResetEmail(e.target.value)} placeholder="seu@email.com" style={inp} autoFocus />
              {resetMsg && (
                <div style={{ padding:"11px 14px", borderRadius:"11px", background:resetMsg.startsWith("✅")?"#22d3a015":"#f04f5e12", border:"1px solid "+(resetMsg.startsWith("✅")?"#22d3a030":"#f04f5e30"), color:resetMsg.startsWith("✅")?"#34d399":"#f87171", fontSize:"13px" }}>
                  {resetMsg}
                </div>
              )}
              <button className="login-btn" onClick={handleReset}
                style={{ padding:"13px", borderRadius:"12px", border:"none", background:"linear-gradient(135deg,#6c63ff,#a78bfa)", color:"#fff", fontWeight:700, fontSize:"13px", cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 24px #6c63ff44" }}>
                📧 Enviar link de recuperação
              </button>
              <button onClick={()=>{ setShowReset(false); setResetMsg(""); }}
                style={{ background:"none", border:"none", color:"#3e3e55", fontSize:"12px", cursor:"pointer", padding:0, textAlign:"center", fontFamily:"inherit" }}>
                ← Voltar ao login
              </button>
            </div>
          </div>
        )}

        <p style={{ textAlign:"center", fontSize:"11px", color:"#1f1f2e", marginTop:"24px", letterSpacing:"0.3px" }}>
          Desenvolvido por Marcelo Alexandre · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TELA DE GERENCIAR USUÁRIOS (apenas admin)
// ─────────────────────────────────────────────────────────────────────────────
function GerenciarUsuarios({ consultores, onAddConsultor, onClose }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novoRole, setNovoRole] = useState("viewer");
  const [novoConsultor, setNovoConsultor] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoModulos, setNovoModulos] = useState(null); // null = todos
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [senhaModal, setSenhaModal] = useState(null); // userId para alterar senha
  const [novaSenhaAlter, setNovaSenhaAlter] = useState("");
  const [senhaAlterSaving, setSenhaAlterSaving] = useState(false);
  const [perfilModal, setPerfilModal] = useState(null); // usuário para visualizar perfil

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, "usuarios"));
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    load();
  }, []);

  const handleAdd = async () => {
    if (!novoEmail.trim() || !novoNome.trim()) { setError("Preencha nome e e-mail."); return; }
    if (novaSenha && novaSenha.length < 6) { setError("A senha deve ter pelo menos 6 caracteres."); return; }
    setSalvando(true); setError(""); setSuccess("");
    try {
      let uid = null;
      let aviso = "";
      // Verificar se já existe perfil no Firestore
      const existeSnap = await getDocs(collection(db, "usuarios"));
      const jaExiste = existeSnap.docs.find(d => d.data().email === novoEmail.trim());
      if (jaExiste) {
        setSalvando(false);
        setError("Este e-mail já possui um perfil cadastrado.");
        return;
      }
      if (novaSenha.trim()) {
        try {
          const secAuth = getSecondaryAuth();
          const cred = await createUserWithEmailAndPassword(secAuth, novoEmail.trim(), novaSenha);
          uid = cred.user.uid;
          await signOut(secAuth);
        } catch(authErr) {
          if (authErr.code === "auth/email-already-in-use") {
            // Conta Auth existe mas sem perfil Firestore — recriar apenas o perfil
            aviso = " (conta já existia no sistema de autenticação — perfil recriado)";
          } else {
            const msgs = { "auth/invalid-email":"E-mail inválido.", "auth/weak-password":"Senha muito fraca (mín. 6 caracteres)." };
            setError(msgs[authErr.code] || "Erro de autenticação: " + authErr.message);
            setSalvando(false); return;
          }
        }
      }
      const perfil = { email: novoEmail.trim(), nome: novoNome.trim(), role: novoRole, consultorName: novoRole === "consultor" ? novoConsultor : "", ...(uid ? { uid } : {}), ...(novoModulos ? { modulosHabilitados: novoModulos } : {}) };
      const ref = await addDoc(collection(db, "usuarios"), perfil);
      setUsuarios(prev => [...prev, { id: ref.id, ...perfil }]);
      if (novoRole === "consultor" && novoConsultor && !consultores.includes(novoConsultor)) {
        onAddConsultor && onAddConsultor({ name: novoConsultor, codigo:"", email: novoEmail.trim() });
      }
      setNovoEmail(""); setNovaSenha(""); setNovoNome(""); setNovoConsultor(""); setNovoRole("viewer"); setNovoModulos(null);
      setSuccess("✅ Usuário criado com sucesso!" + aviso + (novoRole === "consultor" ? " Consultor " + novoConsultor + " vinculado à agenda." : ""));
    } catch(e) {
      setError("Erro ao criar usuário: " + e.message);
    }
    setSalvando(false);
  };

  const handleDelete = async (id, email) => {
    if (!window.confirm("Remover o perfil de " + email + "? (A conta de login precisará ser removida manualmente no Firebase Console se necessário.)")) return;
    await deleteDoc(doc(db, "usuarios", id));
    setUsuarios(prev => prev.filter(u => u.id !== id));
    if (editId === id) setEditId(null);
    setSuccess("🗑 Perfil removido. O usuário não poderá mais acessar o sistema.");
  };

  const handleEditStart = (u) => {
    setEditId(u.id);
    setEditFields({ nome: u.nome || "", role: u.role || "viewer", consultorName: u.consultorName || "", modulosHabilitados: u.modulosHabilitados || null });
  };

  const handleEditSave = async (u) => {
    setEditSaving(true);
    try {
      // modulosHabilitados: null = todos habilitados (salvar como null explicitamente)
      const dados = { ...u, ...editFields, modulosHabilitados: editFields.modulosHabilitados ?? null };
      await setDoc(doc(db, "usuarios", u.id), dados, { merge: true });
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, ...editFields } : x));
      if (editFields.role === "consultor" && editFields.consultorName && !consultores.includes(editFields.consultorName)) {
        onAddConsultor && onAddConsultor({ name: editFields.consultorName, codigo:"", email:"" });
      }
      setEditId(null);
      setSuccess("✅ Usuário atualizado com sucesso!");
    } catch(e) {
      setSuccess(""); setError("Erro ao salvar: " + e.message);
    }
    setEditSaving(false);
  };

  const handleSendReset = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("📧 E-mail de redefinição de senha enviado para " + email);
    } catch(e) {
      setError("Erro ao enviar reset: " + e.message);
    }
  };

  const handleToggleBloqueio = async (u) => {
    const novoStatus = u.bloqueado ? false : true;
    const acao = novoStatus ? "bloquear" : "desbloquear";
    if (!window.confirm(`${novoStatus?"Bloquear":"Desbloquear"} o usuário ${u.nome||u.email}?\n${novoStatus?"O usuário não conseguirá acessar o sistema.":""}`)) return;
    try {
      await setDoc(doc(db,"usuarios",u.id), { bloqueado: novoStatus, bloqueadoEm: novoStatus ? new Date().toISOString() : null }, { merge:true });
      setUsuarios(prev => prev.map(x => x.id===u.id ? {...x, bloqueado:novoStatus} : x));
      setSuccess(novoStatus ? `🔒 Usuário ${u.nome||u.email} bloqueado.` : `🔓 Usuário ${u.nome||u.email} desbloqueado.`);
    } catch(e) {
      setError("Erro ao " + acao + ": " + e.message);
    }
  };

  const handleAlterarSenha = async (u) => {
    if (!novaSenhaAlter.trim() || novaSenhaAlter.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSenhaAlterSaving(true); setError("");
    try {
      // Enviar e-mail de reset com a senha definida via Firebase Admin não está disponível no client SDK
      // Usamos sendPasswordResetEmail + aviso, ou atualização via secondary auth se tiver UID
      await sendPasswordResetEmail(auth, u.email);
      // Salvar flag no Firestore indicando que senha foi solicitada pelo admin
      await setDoc(doc(db,"usuarios",u.id), { senhaAlteradaEm: new Date().toISOString(), senhaAlteradaPor: "admin" }, { merge:true });
      setSenhaModal(null); setNovaSenhaAlter("");
      setSuccess(`📧 Link de redefinição enviado para ${u.email}. O usuário receberá um e-mail para definir a nova senha.`);
    } catch(e) {
      setError("Erro ao alterar senha: " + e.message);
    }
    setSenhaAlterSaving(false);
  };

  const inp = { padding:"8px 12px", borderRadius:"8px", border:"1px solid #2a2a3a", background:"#0d0d14", color:"#c8c8d8", fontSize:"13px", width:"100%", boxSizing:"border-box" };

  // Módulos disponíveis por perfil
  const MODULOS_GESTORES = [{ id:"home",icon:"⬡",label:"Dashboard"},{ id:"agenda",icon:"📅",label:"Agenda"},{ id:"os",icon:"📋",label:"Ordens de Serviço"},{ id:"viagens",icon:"🏨",label:"Viagem e Hospedagem"},{ id:"traslado",icon:"🚗",label:"Traslado"},{ id:"projetos",icon:"📁",label:"Projetos"},{ id:"grade",icon:"🎓",label:"Grade de Conhecimento"},{ id:"alcadas",icon:"🔀",label:"Alçadas de Aprovação"}];
  const MODULOS_POR_PERFIL = {
    admin:             [{ id:"home",icon:"⬡",label:"Dashboard"},{ id:"agenda",icon:"📅",label:"Agenda"},{ id:"os",icon:"📋",label:"Ordens de Serviço"},{ id:"viagens",icon:"🏨",label:"Viagem e Hospedagem"},{ id:"traslado",icon:"🚗",label:"Traslado"},{ id:"projetos",icon:"📁",label:"Projetos"},{ id:"alcadas",icon:"🔀",label:"Alçadas"},{ id:"cadastros",icon:"🗂",label:"Cadastros"}],
    editor:            MODULOS_GESTORES,
    diretor_executivo: MODULOS_GESTORES,
    diretor:           MODULOS_GESTORES,
    gerente_executivo: MODULOS_GESTORES,
    gerente:           MODULOS_GESTORES,
    coordenador:       [{ id:"home",icon:"⬡",label:"Dashboard"},{ id:"agenda",icon:"📅",label:"Agenda"},{ id:"viagens",icon:"🏨",label:"Viagem e Hospedagem"},{ id:"traslado",icon:"🚗",label:"Traslado"},{ id:"alcadas",icon:"🔀",label:"Alçadas"}],
    viewer:            [{ id:"agenda",icon:"📅",label:"Agenda"},{ id:"viagens",icon:"🏨",label:"Viagem e Hospedagem"}],
    consultor:         [{ id:"agenda",icon:"📅",label:"Agenda"},{ id:"grade",icon:"🎓",label:"Grade de Conhecimento"},{ id:"viagens",icon:"🏨",label:"Viagem e Hospedagem"},{ id:"traslado",icon:"🚗",label:"Traslado"}],
    administrativo:    [{ id:"home",icon:"⬡",label:"Dashboard"},{ id:"agenda",icon:"📅",label:"Agenda"},{ id:"viagens",icon:"🏨",label:"Viagem e Hospedagem"}],
  };

  const ModulosToggle = ({ role, value, onChange }) => {
    const disponiveis = MODULOS_POR_PERFIL[role] || [];
    const habilitados = value || disponiveis.map(m=>m.id); // null/undefined = todos
    const toggle = (id) => {
      const next = habilitados.includes(id) ? habilitados.filter(x=>x!==id) : [...habilitados,id];
      onChange(next.length === disponiveis.length ? null : next); // null = todos habilitados
    };
    const allOn = !value || value.length === disponiveis.length;
    return (
      <div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px" }}>
          <label style={{ fontSize:"11px",color:"#6e6e88",fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase" }}>Módulos habilitados</label>
          <button onClick={()=>onChange(null)} style={{ fontSize:"10px",background:"none",border:"none",color:"#6c63ff",cursor:"pointer",fontWeight:600,fontFamily:"inherit" }}>
            {allOn?"✓ Todos":"Habilitar todos"}
          </button>
        </div>
        <div style={{ display:"flex",flexWrap:"wrap",gap:"6px" }}>
          {disponiveis.map(m=>{
            const on = habilitados.includes(m.id);
            return (
              <button key={m.id} onClick={()=>toggle(m.id)}
                style={{ padding:"5px 12px",borderRadius:"8px",border:"1px solid "+(on?"#6c63ff":"#2a2a3a"),background:on?"#6c63ff22":"transparent",color:on?"#a78bfa":"#6e6e88",fontSize:"12px",fontWeight:on?700:400,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"5px",transition:"all .15s" }}>
                <span>{m.icon}</span> {m.label}
                {on && <span style={{ color:"#6c63ff",fontSize:"10px" }}>✓</span>}
              </button>
            );
          })}
        </div>
        {!allOn && <div style={{ fontSize:"10px",color:"#3e3e55",marginTop:"6px" }}>{habilitados.length} de {disponiveis.length} módulos habilitados</div>}
      </div>
    );
  };

  return (
    <>
    {/* Modal de alteração de senha */}
    {/* Modal de visualização de perfil */}
    {perfilModal && (() => {
      const u = perfilModal;
      const badge = ROLE_BADGES[u.role] || ROLE_BADGES.viewer;
      const disponiveis = MODULOS_POR_PERFIL[u.role] || [];
      const habilitados = u.modulosHabilitados || disponiveis.map(m=>m.id);
      const modAtivos = disponiveis.filter(m => habilitados.includes(m.id));
      const modBloq   = disponiveis.filter(m => !habilitados.includes(m.id));
      return (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
          <div style={{ background:"#18181f", borderRadius:"16px", padding:"28px", width:"100%", maxWidth:"480px", border:"1px solid #2a2a3a", boxShadow:"0 20px 60px rgba(0,0,0,0.6)" }}>
            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                <div style={{ width:"42px", height:"42px", borderRadius:"12px", background:`linear-gradient(135deg,${badge.color}33,${badge.color}11)`, border:`1px solid ${badge.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px" }}>
                  {u.bloqueado ? "🔒" : "👤"}
                </div>
                <div>
                  <div style={{ fontSize:"15px", fontWeight:700, color:"#f0f0fa" }}>{u.nome}</div>
                  <div style={{ fontSize:"12px", color:"#6e6e88", marginTop:"2px" }}>{u.email}</div>
                </div>
              </div>
              <button onClick={()=>setPerfilModal(null)} style={{ background:"#2a2a3a", border:"none", color:"#6e6e88", borderRadius:"8px", width:"30px", height:"30px", cursor:"pointer", fontSize:"14px" }}>✕</button>
            </div>

            {/* Perfil e status */}
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"20px" }}>
              <span style={{ padding:"4px 12px", borderRadius:"99px", fontSize:"12px", fontWeight:700, color:badge.color, background:badge.bg, border:`1px solid ${badge.color}44` }}>{badge.label}</span>
              {u.consultorName && <span style={{ padding:"4px 12px", borderRadius:"99px", fontSize:"12px", color:"#9090b0", background:"#1f1f2e", border:"1px solid #2a2a3a" }}>👤 {u.consultorName}</span>}
              {u.bloqueado && <span style={{ padding:"4px 12px", borderRadius:"99px", fontSize:"12px", fontWeight:700, color:"#f04f5e", background:"#f04f5e18", border:"1px solid #f04f5e33" }}>🔒 Bloqueado</span>}
              {!u.bloqueado && <span style={{ padding:"4px 12px", borderRadius:"99px", fontSize:"12px", fontWeight:700, color:"#22d3a0", background:"#22d3a018", border:"1px solid #22d3a033" }}>✅ Ativo</span>}
            </div>

            {/* Módulos habilitados */}
            <div style={{ marginBottom:"16px" }}>
              <div style={{ fontSize:"11px", color:"#6e6e88", fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:"10px" }}>
                Módulos habilitados ({modAtivos.length}/{disponiveis.length})
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                {modAtivos.map(m => (
                  <span key={m.id} style={{ padding:"4px 10px", borderRadius:"8px", fontSize:"11px", fontWeight:600, background:"#22d3a015", border:"1px solid #22d3a033", color:"#22d3a0" }}>
                    {m.icon} {m.label}
                  </span>
                ))}
                {modBloq.map(m => (
                  <span key={m.id} style={{ padding:"4px 10px", borderRadius:"8px", fontSize:"11px", fontWeight:600, background:"#1f1f2e", border:"1px solid #2a2a3a", color:"#3e3e55", textDecoration:"line-through" }}>
                    {m.icon} {m.label}
                  </span>
                ))}
              </div>
              {disponiveis.length === 0 && <div style={{ fontSize:"12px", color:"#3e3e55" }}>Nenhum módulo configurado para este perfil</div>}
            </div>

            {/* Datas */}
            <div style={{ background:"#0d0d14", borderRadius:"10px", padding:"12px 14px", fontSize:"12px" }}>
              {u.senhaAlteradaEm && <div style={{ color:"#6e6e88", marginBottom:"4px" }}>🔑 Senha redefinida em: <span style={{ color:"#c8c8d8" }}>{new Date(u.senhaAlteradaEm).toLocaleString("pt-BR")}</span></div>}
              {u.bloqueadoEm && u.bloqueado && <div style={{ color:"#f04f5e" }}>🔒 Bloqueado em: {new Date(u.bloqueadoEm).toLocaleString("pt-BR")}</div>}
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", marginTop:"18px" }}>
              <button onClick={()=>setPerfilModal(null)} style={{ padding:"8px 20px", borderRadius:"9px", border:"1px solid #2a2a3a", background:"transparent", color:"#6e6e88", cursor:"pointer", fontWeight:600, fontSize:"13px", fontFamily:"inherit" }}>Fechar</button>
            </div>
          </div>
        </div>
      );
    })()}

    {senhaModal && (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
        <div style={{ background:"#18181f", borderRadius:"16px", padding:"28px", width:"100%", maxWidth:"420px", border:"1px solid #2a2a3a", boxShadow:"0 20px 60px rgba(0,0,0,0.6)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
            <div>
              <h3 style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:"16px", fontWeight:800, color:"#f0f0fa", margin:0 }}>🔑 Alterar Senha</h3>
              <div style={{ fontSize:"12px", color:"#6e6e88", marginTop:"3px" }}>{senhaModal.nome} · {senhaModal.email}</div>
            </div>
            <button onClick={()=>{setSenhaModal(null);setNovaSenhaAlter("");setError("");}} style={{ background:"#2a2a3a", border:"none", color:"#6e6e88", borderRadius:"8px", width:"30px", height:"30px", cursor:"pointer", fontSize:"14px" }}>✕</button>
          </div>
          <div style={{ background:"#f5a62315", border:"1px solid #f5a62333", borderRadius:"10px", padding:"12px 14px", fontSize:"12px", color:"#f5a623", marginBottom:"18px", lineHeight:1.6 }}>
            ⚠️ Por segurança, o Firebase não permite que administradores definam senhas diretamente pelo app. Será enviado um <strong>link de redefinição</strong> para o e-mail do usuário para que ele defina a nova senha.
          </div>
          <div style={{ fontSize:"13px", color:"#c8c8d8", marginBottom:"16px" }}>
            Clique em confirmar para enviar o e-mail de redefinição para <strong style={{ color:"#a78bfa" }}>{senhaModal.email}</strong>.
          </div>
          {error && <div style={{ padding:"8px 12px", borderRadius:"8px", background:"#ef444422", border:"1px solid #ef444444", color:"#ef4444", fontSize:"12px", marginBottom:"12px" }}>⚠️ {error}</div>}
          <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
            <button onClick={()=>{setSenhaModal(null);setNovaSenhaAlter("");setError("");}}
              style={{ padding:"9px 18px", borderRadius:"9px", border:"1px solid #2a2a3a", background:"transparent", color:"#6e6e88", cursor:"pointer", fontWeight:600, fontSize:"13px", fontFamily:"inherit" }}>Cancelar</button>
            <button onClick={()=>handleAlterarSenha(senhaModal)} disabled={senhaAlterSaving}
              style={{ padding:"9px 22px", borderRadius:"9px", border:"none", background:"linear-gradient(135deg,#22d3a0,#10b981)", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:"13px", fontFamily:"inherit", opacity:senhaAlterSaving?0.6:1 }}>
              {senhaAlterSaving ? "Enviando..." : "📧 Enviar link de redefinição"}
            </button>
          </div>
        </div>
      </div>
    )}

    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:"#18181f", borderRadius:"16px", padding:"28px", width:"100%", maxWidth:"660px", border:"1px solid #2a2a3a", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
          <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:"18px", fontWeight:700, color:"#f0f0fa", margin:0 }}>👥 Gerenciar Usuários</h2>
          <button onClick={onClose} style={{ background:"#2a2a3a", border:"none", color:"#6e6e88", borderRadius:"8px", width:"32px", height:"32px", cursor:"pointer", fontSize:"16px" }}>✕</button>
        </div>

        {/* Lista de usuários */}
        <div style={{ marginBottom:"24px" }}>
          <h3 style={{ fontSize:"13px", fontWeight:700, color:"#6e6e88", marginBottom:"10px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Usuários cadastrados</h3>
          {loading ? <p style={{ color:"#6e6e88", fontSize:"13px" }}>Carregando...</p> : (
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {usuarios.map(u => {
                const badge = ROLE_BADGES[u.role] || ROLE_BADGES.viewer;
                const isEditing = editId === u.id;
                const isBloqueado = !!u.bloqueado;
                return (
                  <div key={u.id} style={{ background:"#0d0d14", borderRadius:"10px", border:"1px solid " + (isBloqueado?"#f04f5e33":isEditing?"#3b82f6":"#18181f"), overflow:"hidden" }}>
                    {/* Linha principal */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px" }}>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:"13px", fontWeight:600, color: isBloqueado?"#6e6e88":"#f0f0fa", display:"flex", alignItems:"center", gap:"8px" }}>
                          {isBloqueado && <span style={{ fontSize:"12px" }}>🔒</span>}
                          {u.nome} <span style={{ fontSize:"11px", color:"#6e6e88" }}>· {u.email}</span>
                        </div>
                        <div style={{ display:"flex", gap:"6px", marginTop:"3px", flexWrap:"wrap" }}>
                          <span style={{ fontSize:"11px", fontWeight:700, color:badge.color, background:badge.bg, padding:"1px 8px", borderRadius:"10px" }}>{badge.label}</span>
                          {u.consultorName && <span style={{ fontSize:"11px", color:"#6e6e88" }}>{u.consultorName}</span>}
                          {u.modulosHabilitados && <span style={{ fontSize:"10px", color:"#3e3e55", padding:"1px 7px", borderRadius:"99px", background:"#1f1f2e" }}>🔧 {u.modulosHabilitados.length} módulo{u.modulosHabilitados.length!==1?"s":""}</span>}
                          {isBloqueado && <span style={{ fontSize:"10px", fontWeight:700, color:"#f04f5e", background:"#f04f5e18", padding:"1px 8px", borderRadius:"99px", border:"1px solid #f04f5e33" }}>🔒 Bloqueado</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:"5px", flexShrink:0 }}>
                        <button onClick={()=>setPerfilModal(u)}
                          style={{ background:"#6c63ff18", border:"1px solid #6c63ff44", color:"#a78bfa", borderRadius:"6px", padding:"4px 10px", cursor:"pointer", fontSize:"11px", fontWeight:600 }}>
                          👁 Perfil
                        </button>
                        <button onClick={()=>isEditing ? setEditId(null) : handleEditStart(u)}
                          style={{ background:isEditing?"#2a2a3a":"#6c63ff22", border:"1px solid "+(isEditing?"#6e6e88":"#6c63ff44"), color:isEditing?"#6e6e88":"#a78bfa", borderRadius:"6px", padding:"4px 10px", cursor:"pointer", fontSize:"11px", fontWeight:600 }}>
                          {isEditing ? "✕" : "✏️ Editar"}
                        </button>
                        <button onClick={()=>setSenhaModal(u)}
                          style={{ background:"#22d3a018", border:"1px solid #22d3a044", color:"#22d3a0", borderRadius:"6px", padding:"4px 10px", cursor:"pointer", fontSize:"11px", fontWeight:600 }}>
                          🔑 Senha
                        </button>
                        <button onClick={()=>handleToggleBloqueio(u)}
                          style={{ background:isBloqueado?"#22d3a018":"#f04f5e18", border:"1px solid "+(isBloqueado?"#22d3a044":"#f04f5e44"), color:isBloqueado?"#22d3a0":"#f04f5e", borderRadius:"6px", padding:"4px 10px", cursor:"pointer", fontSize:"11px", fontWeight:600 }}>
                          {isBloqueado?"🔓 Desbloquear":"🔒 Bloquear"}
                        </button>
                        <button onClick={()=>handleDelete(u.id, u.email)}
                          style={{ background:"#ef444422", border:"1px solid #ef444444", color:"#ef4444", borderRadius:"6px", padding:"4px 10px", cursor:"pointer", fontSize:"11px", fontWeight:600 }}>
                          🗑
                        </button>
                      </div>
                    </div>
                    {/* Painel de edição inline */}
                    {isEditing && (
                      <div style={{ padding:"14px", borderTop:"1px solid #18181f", background:"#0a1628" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px" }}>
                          <div>
                            <label style={{ fontSize:"11px", color:"#6e6e88", fontWeight:600, display:"block", marginBottom:"4px" }}>Nome</label>
                            <input value={editFields.nome} onChange={e=>setEditFields(f=>({...f,nome:e.target.value}))} style={inp} />
                          </div>
                          <div>
                            <label style={{ fontSize:"11px", color:"#6e6e88", fontWeight:600, display:"block", marginBottom:"4px" }}>Perfil</label>
                            <select value={editFields.role} onChange={e=>setEditFields(f=>({...f,role:e.target.value}))} style={inp}>
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Visualizador</option>
                              <option value="diretor_executivo">Diretor Executivo</option>
                              <option value="diretor">Diretor</option>
                              <option value="gerente_executivo">Gerente Executivo</option>
                              <option value="gerente">Gerente</option>
                              <option value="coordenador">Coordenador</option>
                              <option value="consultor">Consultor</option>
                              <option value="administrativo">Administrativo</option>
                            </select>
                          </div>
                          {editFields.role === "consultor" && (
                            <div style={{ gridColumn:"1/-1" }}>
                              <label style={{ fontSize:"11px", color:"#6e6e88", fontWeight:600, display:"block", marginBottom:"4px" }}>Consultor vinculado</label>
                              <select value={editFields.consultorName} onChange={e=>setEditFields(f=>({...f,consultorName:e.target.value}))} style={inp}>
                                <option value="">Selecione...</option>
                                {consultores.map(c=><option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          )}
                          <div style={{ gridColumn:"1/-1",background:"#111118",borderRadius:"10px",border:"1px solid #1f1f2e",padding:"12px" }}>
                            <ModulosToggle
                              role={editFields.role}
                              value={editFields.modulosHabilitados}
                              onChange={v=>setEditFields(f=>({...f,modulosHabilitados:v}))}
                            />
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                          <button onClick={()=>handleEditSave(u)} disabled={editSaving} style={{ padding:"7px 16px", borderRadius:"8px", border:"none", background:"#22d3a0", color:"#fff", fontWeight:700, fontSize:"12px", cursor:"pointer" }}>{editSaving ? "Salvando..." : "💾 Salvar"}</button>
                          <button onClick={()=>handleSendReset(u.email)} style={{ padding:"7px 16px", borderRadius:"8px", border:"1px solid #3b82f644", background:"#6c63ff22", color:"#6c63ff", fontWeight:600, fontSize:"12px", cursor:"pointer" }}>🔑 Reset de senha</button>
                          <button onClick={()=>setEditId(null)} style={{ padding:"7px 16px", borderRadius:"8px", border:"1px solid #2a2a3a", background:"transparent", color:"#6e6e88", fontWeight:600, fontSize:"12px", cursor:"pointer" }}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Adicionar novo usuário */}
        <div style={{ borderTop:"1px solid #2a2a3a", paddingTop:"20px" }}>
          <h3 style={{ fontSize:"13px", fontWeight:700, color:"#6e6e88", marginBottom:"14px", textTransform:"uppercase", letterSpacing:"0.05em" }}>➕ Novo usuário</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
            <div><label style={{ fontSize:"11px", color:"#6e6e88", fontWeight:600, display:"block", marginBottom:"5px" }}>Nome *</label><input value={novoNome} onChange={e=>setNovoNome(e.target.value)} placeholder="Nome completo" style={inp}/></div>
            <div><label style={{ fontSize:"11px", color:"#6e6e88", fontWeight:600, display:"block", marginBottom:"5px" }}>E-mail *</label><input type="email" value={novoEmail} onChange={e=>setNovoEmail(e.target.value)} placeholder="email@exemplo.com" style={inp}/></div>
            <div><label style={{ fontSize:"11px", color:"#6e6e88", fontWeight:600, display:"block", marginBottom:"5px" }}>Senha (mín. 6 caracteres)</label><input type="password" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} placeholder="••••••••" style={inp}/></div>
            <div><label style={{ fontSize:"11px", color:"#6e6e88", fontWeight:600, display:"block", marginBottom:"5px" }}>Perfil *</label>
              <select value={novoRole} onChange={e=>setNovoRole(e.target.value)} style={inp}>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Visualizador</option>
                <option value="diretor_executivo">Diretor Executivo</option>
                <option value="diretor">Diretor</option>
                <option value="gerente_executivo">Gerente Executivo</option>
                <option value="gerente">Gerente</option>
                <option value="coordenador">Coordenador</option>
                <option value="consultor">Consultor</option>
                <option value="administrativo">Administrativo</option>
              </select>
            </div>
            {novoRole === "consultor" && (
              <div style={{ gridColumn:"1/-1" }}><label style={{ fontSize:"11px", color:"#6e6e88", fontWeight:600, display:"block", marginBottom:"5px" }}>Consultor vinculado *</label>
                <select value={novoConsultor} onChange={e=>setNovoConsultor(e.target.value)} style={inp}>
                  <option value="">Selecione o consultor...</option>
                  {consultores.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div style={{ gridColumn:"1/-1",background:"#111118",borderRadius:"10px",border:"1px solid #1f1f2e",padding:"12px" }}>
              <ModulosToggle role={novoRole} value={novoModulos} onChange={setNovoModulos}/>
            </div>
          </div>
          {error && <div style={{ padding:"8px 12px", borderRadius:"8px", background:"#ef444422", border:"1px solid #ef444444", color:"#ef4444", fontSize:"12px", marginBottom:"10px" }}>⚠️ {error}</div>}
          {success && <div style={{ padding:"8px 12px", borderRadius:"8px", background:"#22c55e22", border:"1px solid #22c55e44", color:"#22d3a0", fontSize:"12px", marginBottom:"10px" }}>{success}</div>}
          <button onClick={handleAdd} disabled={salvando} style={{ width:"100%", padding:"11px", borderRadius:"8px", border:"none", background:salvando?"#2a2a3a":"#22c55e", color:salvando?"#6e6e88":"#fff", fontWeight:700, fontSize:"14px", cursor:salvando?"not-allowed":"pointer" }}>
            {salvando ? "Criando usuário..." : "✅ Criar usuário"}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD DE RESERVAS (PDF de hotel e voo) — aparece em viagens aprovadas
// ─────────────────────────────────────────────────────────────────────────────
function UploadReserva({ viagem, onUpdate }) {
  const [uploading, setUploading] = useState(null); // "hotel" | "voo" | null
  const [erro,      setErro]      = useState(null);

  const TIPOS = [
    { key:"pdfHotel", label:"🏨 Reserva de Hotel", icon:"🏨" },
    { key:"pdfVoo",   label:"✈️ Passagem / Voo",  icon:"✈️" },
  ];

  const handleUpload = async (e, tipo) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { setErro("Apenas arquivos PDF são aceitos."); return; }
    if (file.size > 5 * 1024 * 1024) { setErro("Arquivo muito grande. Máximo 5MB."); return; }
    setErro(null);
    setUploading(tipo);
    try {
      const path = `viagens/${viagem.id}/${tipo}_${Date.now()}.pdf`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType:"application/pdf" });
      const url = await getDownloadURL(storageRef);
      // Deletar arquivo anterior se existir
      if (viagem[tipo+"Path"]) {
        try { await deleteObject(ref(storage, viagem[tipo+"Path"])); } catch(_) {}
      }
      onUpdate({ ...viagem, [tipo]: url, [tipo+"Name"]: file.name, [tipo+"Path"]: path });
    } catch(e) {
      console.error(e);
      setErro("Erro ao fazer upload: " + e.message);
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  };

  const handleRemove = async (tipo) => {
    if (!window.confirm("Remover este arquivo?")) return;
    try {
      if (viagem[tipo+"Path"]) await deleteObject(ref(storage, viagem[tipo+"Path"]));
    } catch(_) {}
    onUpdate({ ...viagem, [tipo]: null, [tipo+"Name"]: null, [tipo+"Path"]: null });
  };

  return (
    <div style={{ marginTop:"14px",background:"#0d0d14",borderRadius:"12px",border:"1px solid #1f1f2e",padding:"14px 16px" }}>
      <div style={{ fontSize:"10px",color:"#6c63ff",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"12px" }}>
        📎 Documentos da Reserva
      </div>
      {erro && (
        <div style={{ marginBottom:"10px",padding:"7px 12px",borderRadius:"8px",background:"#f04f5e15",border:"1px solid #f04f5e44",fontSize:"11px",color:"#f04f5e" }}>
          ⚠️ {erro}
        </div>
      )}
      <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
        {TIPOS.map(({ key, label, icon }) => {
          const hasFile = !!viagem[key];
          const isUp    = uploading === key;
          return (
            <div key={key} style={{ display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap" }}>
              {/* Info do arquivo */}
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:"12px",fontWeight:600,color:hasFile?"#f0f0fa":"#6e6e88" }}>{label}</div>
                {hasFile && (
                  <div style={{ fontSize:"10px",color:"#6e6e88",marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                    📄 {viagem[key+"Name"]||"arquivo.pdf"}
                  </div>
                )}
              </div>

              {/* Ações */}
              <div style={{ display:"flex",gap:"6px",flexShrink:0 }}>
                {hasFile && (
                  <>
                    <a href={viagem[key]} target="_blank" rel="noreferrer"
                      style={{ padding:"5px 12px",borderRadius:"8px",border:"1px solid #22d3a044",background:"#22d3a018",color:"#22d3a0",fontSize:"11px",fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:"4px" }}>
                      👁 Visualizar
                    </a>
                    <button onClick={()=>handleRemove(key)}
                      style={{ padding:"5px 10px",borderRadius:"8px",border:"1px solid #f04f5e44",background:"#f04f5e18",color:"#f04f5e",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"inherit" }}>
                      🗑
                    </button>
                  </>
                )}
                <label style={{ padding:"5px 12px",borderRadius:"8px",border:"1px solid "+(hasFile?"#2a2a3a":"#6c63ff44"),background:hasFile?"transparent":"#6c63ff18",color:hasFile?"#6e6e88":"#a78bfa",fontSize:"11px",fontWeight:700,cursor:isUp?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:"4px",opacity:isUp?0.6:1 }}>
                  {isUp ? "⏳ Enviando..." : hasFile ? "🔄 Substituir" : "📤 Upload PDF"}
                  <input type="file" accept="application/pdf" style={{ display:"none" }}
                    disabled={!!uploading}
                    onChange={e=>handleUpload(e, key)}/>
                </label>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:"10px",fontSize:"10px",color:"#3e3e55" }}>
        Formatos aceitos: PDF · Tamanho máximo: 5MB por arquivo
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO: SOLICITAÇÃO DE VIAGEM
// ─────────────────────────────────────────────────────────────────────────────
function ViagemCard({ viagem, STATUS_CONFIG, canManage, onEdit, onStatusChange, onDelete, onUpdateGastos }) {
  const [expandido, setExpandido] = useState(false);
  const [comentario, setComentario] = useState("");
  const [acaoAtiva, setAcaoAtiva]   = useState(null);
  const st = STATUS_CONFIG[viagem.status]||STATUS_CONFIG.pendente;
  const temVoo  = viagem.incluirVoo === true;
  const temHosp = !!viagem.cidadeHospedagem;

  return (
    <div style={{ background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e",overflow:"hidden" }}>
      <div style={{ padding:"14px 20px",display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap",cursor:"pointer" }} onClick={()=>setExpandido(e=>!e)}>
        <div style={{ fontSize:"22px" }}>{temVoo?"✈️":"🏨"}</div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa" }}>
            {viagem.cliente||viagem.destino||"(sem cliente)"}
            {viagem.consultor && <span style={{ fontSize:"11px",color:"#6e6e88",fontWeight:400,marginLeft:"8px" }}>— {viagem.consultor.split(" ")[0]}</span>}
          </div>
          <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"2px",display:"flex",gap:"10px",flexWrap:"wrap" }}>
            <span>👤 {viagem.solicitante}</span>
            {viagem.checkIn && <span>🏨 {viagem.checkIn}{viagem.checkOut?" → "+viagem.checkOut:""}</span>}
            {temVoo && viagem.dataVooIda && <span>✈️ {viagem.dataVooIda}</span>}
            {viagem.motivo && <span>📌 {viagem.motivo}</span>}
          </div>
        </div>
        {temVoo  && <span style={{ fontSize:"10px",padding:"2px 8px",borderRadius:"99px",background:"#6c63ff18",border:"1px solid #6c63ff33",color:"#a78bfa",fontWeight:700 }}>✈️ Voo</span>}
        {temHosp && <span style={{ fontSize:"10px",padding:"2px 8px",borderRadius:"99px",background:"#22d3a018",border:"1px solid #22d3a033",color:"#22d3a0",fontWeight:700 }}>🏨 Hosp.</span>}
        <span style={{ padding:"4px 12px",borderRadius:"99px",background:st.bg,border:"1px solid "+st.color+"44",fontSize:"11px",fontWeight:700,color:st.color,whiteSpace:"nowrap" }}>{st.label}</span>
        <span style={{ color:"#3e3e55",fontSize:"12px" }}>{expandido?"▴":"▾"}</span>
      </div>

      {expandido && (
        <div style={{ borderTop:"1px solid #1f1f2e",padding:"16px 20px" }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px",fontSize:"12px" }}>
            <div style={{ background:"#0d0d14",borderRadius:"10px",padding:"12px 14px" }}>
              <div style={{ fontSize:"10px",color:"#6c63ff",fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",marginBottom:"8px" }}>Solicitação</div>
              {[["Solicitante",viagem.solicitante],["Setor",viagem.setor],["Consultor",viagem.consultor],["Cliente",viagem.cliente],["Endereço",viagem.enderecoCliente],["Motivo",viagem.motivo],["Cobrança",viagem.destinoCobranca],["Observações",viagem.observacoes]].filter(([,v])=>v).map(([k,v])=>(
                <div key={k} style={{ marginBottom:"4px" }}><span style={{ color:"#6e6e88" }}>{k}: </span><span style={{ color:"#c8c8d8" }}>{v}</span></div>
              ))}
            </div>
            <div style={{ background:"#0d0d14",borderRadius:"10px",padding:"12px 14px" }}>
              <div style={{ fontSize:"10px",color:"#22d3a0",fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",marginBottom:"8px" }}>🏨 Hospedagem</div>
              {viagem.cidadeHospedagem
                ? [["Cidade",viagem.cidadeHospedagem],["Check-in",viagem.checkIn],["Check-out",viagem.checkOut]].filter(([,v])=>v).map(([k,v])=>(
                    <div key={k} style={{ marginBottom:"4px" }}><span style={{ color:"#6e6e88" }}>{k}: </span><span style={{ color:"#c8c8d8" }}>{v}</span></div>
                  ))
                : <div style={{ color:"#3e3e55",fontSize:"11px" }}>Sem hospedagem</div>
              }
            </div>
            {temVoo && (
              <div style={{ gridColumn:"1/-1",background:"#0d0d14",borderRadius:"10px",padding:"12px 14px" }}>
                <div style={{ fontSize:"10px",color:"#a78bfa",fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",marginBottom:"8px" }}>✈️ Voo</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px" }}>
                  {[["Origem",viagem.aeroportoOrigem],["Destino",viagem.aeroportoDestino],["Data ida",viagem.dataVooIda],["Horário ida",viagem.horarioIda],["Data volta",viagem.dataVooVolta],["Horário volta",viagem.horarioVolta]].filter(([,v])=>v).map(([k,v])=>(
                    <div key={k}><span style={{ color:"#6e6e88" }}>{k}: </span><span style={{ color:"#c8c8d8" }}>{v}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display:"flex",gap:"8px",flexWrap:"wrap" }}>
            {canManage && (
              <>
                <button onClick={(e)=>{e.stopPropagation();onEdit(viagem);setExpandido(false);}}
                  style={{ padding:"7px 16px",borderRadius:"8px",border:"1px solid #6c63ff44",background:"#6c63ff18",color:"#a78bfa",cursor:"pointer",fontSize:"12px",fontWeight:600,fontFamily:"inherit" }}>✏️ Editar</button>
                {[{k:"aprovada",label:"✅ Aprovar",color:"#22d3a0"},{k:"rejeitada",label:"❌ Rejeitar",color:"#f04f5e"},{k:"realizada",label:"🏁 Realizada",color:"#6c63ff"}].filter(btn=>btn.k!==viagem.status).map(btn=>(
                  <button key={btn.k} onClick={(e)=>{e.stopPropagation();setAcaoAtiva(acaoAtiva===btn.k?null:btn.k);}}
                    style={{ padding:"7px 14px",borderRadius:"8px",border:"1px solid "+btn.color+"44",background:acaoAtiva===btn.k?btn.color+"22":"transparent",color:btn.color,cursor:"pointer",fontSize:"11px",fontWeight:600,fontFamily:"inherit" }}>
                    {btn.label}
                  </button>
                ))}
                <button onClick={(e)=>{e.stopPropagation();onDelete(viagem.id);}}
                  style={{ padding:"7px 14px",borderRadius:"8px",border:"1px solid #f04f5e44",background:"#f04f5e18",color:"#f04f5e",cursor:"pointer",fontSize:"11px",fontWeight:600,fontFamily:"inherit" }}>🗑</button>
              </>
            )}
          </div>

          {acaoAtiva && (
            <div style={{ marginTop:"12px",background:"#0d0d14",borderRadius:"10px",padding:"12px" }}>
              <textarea value={comentario} onChange={e=>setComentario(e.target.value)} rows={2} placeholder="Comentário (opcional)..."
                style={{ width:"100%",padding:"8px 12px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#111118",color:"#c8c8d8",fontSize:"12px",fontFamily:"inherit",resize:"none",outline:"none",boxSizing:"border-box" }}/>
              <div style={{ display:"flex",gap:"8px",marginTop:"8px",justifyContent:"flex-end" }}>
                <button onClick={()=>{setAcaoAtiva(null);setComentario("");}} style={{ padding:"6px 14px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontSize:"11px",fontFamily:"inherit" }}>Cancelar</button>
                <button onClick={(e)=>{e.stopPropagation();onStatusChange(viagem.id,acaoAtiva,comentario);setAcaoAtiva(null);setComentario("");}}
                  style={{ padding:"6px 16px",borderRadius:"8px",border:"none",background:"#22d3a0",color:"#fff",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"inherit" }}>Confirmar</button>
              </div>
            </div>
          )}
          {viagem.comentarioGestor && (
            <div style={{ marginTop:"10px",fontSize:"12px",color:"#f5a623",background:"#f5a62310",borderRadius:"8px",padding:"8px 12px" }}>💬 Gestor: {viagem.comentarioGestor}</div>
          )}

          {/* PDFs de reserva — visualização para consultor, upload para gestor */}
          {viagem.status === "aprovada" && (viagem.pdfHotel || viagem.pdfVoo) && !canManage && (
            <div style={{ marginTop:"14px",background:"#0d0d14",borderRadius:"12px",border:"1px solid #22d3a033",padding:"12px 16px" }}>
              <div style={{ fontSize:"10px",color:"#22d3a0",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"10px" }}>📎 Documentos da Reserva</div>
              <div style={{ display:"flex",gap:"8px",flexWrap:"wrap" }}>
                {viagem.pdfHotel && (
                  <a href={viagem.pdfHotel} target="_blank" rel="noreferrer"
                    style={{ display:"flex",alignItems:"center",gap:"6px",padding:"7px 14px",borderRadius:"9px",border:"1px solid #22d3a044",background:"#22d3a018",color:"#22d3a0",fontSize:"12px",fontWeight:700,textDecoration:"none" }}>
                    🏨 {viagem.pdfHotelName||"Reserva Hotel.pdf"}
                  </a>
                )}
                {viagem.pdfVoo && (
                  <a href={viagem.pdfVoo} target="_blank" rel="noreferrer"
                    style={{ display:"flex",alignItems:"center",gap:"6px",padding:"7px 14px",borderRadius:"9px",border:"1px solid #a78bfa44",background:"#a78bfa18",color:"#a78bfa",fontSize:"12px",fontWeight:700,textDecoration:"none" }}>
                    ✈️ {viagem.pdfVooName||"Passagem.pdf"}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Upload de PDFs — disponível apenas para gestor/admin quando aprovada */}
          {viagem.status === "aprovada" && canManage && (
            <UploadReserva
              viagem={viagem}
              onUpdate={onUpdateGastos}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO: ALÇADAS DE APROVAÇÃO
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO: TRASLADO — Cadastro de unidades + RDA
// ─────────────────────────────────────────────────────────────────────────────

const ITENS_DESPESA = [
  { cod:"000001", desc:"KILOMETRAGEM",    unit:"KM",   teto:0 },
  { cod:"000002", desc:"PEDAGIO",         unit:"UN",   teto:0 },
  { cod:"000003", desc:"ESTACIONAMENTO",  unit:"UN",   teto:0 },
  { cod:"000004", desc:"ALIMENTAÇÃO",     unit:"UN",   teto:0 },
  { cod:"000005", desc:"COMBUSTIVEL",     unit:"LT",   teto:0 },
  { cod:"000006", desc:"TAXI/UBER",       unit:"UN",   teto:0 },
  { cod:"000007", desc:"OUTROS",          unit:"UN",   teto:0 },
];

const MOTIVOS_RDA = [
  "1 - VIAGEM C/ PERNOITE",
  "2 - VIAGEM S/ PERNOITE",
  "3 - ATENDIMENTO LOCAL",
  "4 - DESLOCAMENTO DIÁRIO",
];

function ModuloTraslado({ currentUser, canManage, canApprove, consultores, clientList, projects, theme: T }) {
  const [aba,          setAba]         = useState("rda");
  const [unidades,     setUnidades]    = useState([]);
  const [rdas,         setRdas]        = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [showFormUn,   setShowFormUn]  = useState(false);
  const [editUn,       setEditUn]      = useState(null);
  const [showFormRda,  setShowFormRda] = useState(false);
  const [editRda,      setEditRda]     = useState(null);
  const [filtroCliente,setFiltroCliente]= useState("");

  const isConsultor = currentUser.role === "consultor";
  const nomeLogado  = currentUser.consultorName || currentUser.nome || currentUser.username || "";
  // Buscar código do consultor nos metadados cadastrados
  const metaConsultor = (window.__consultoresMeta||[]).find(c=>c.name===nomeLogado);
  const codTecnico  = metaConsultor?.codigo || currentUser.codigo || "";

  useEffect(() => {
    const load = async () => {
      try {
        const [snapU, snapR] = await Promise.all([
          getDoc(doc(db,"app_data","traslado_unidades")),
          getDoc(doc(db,"app_data","traslado_rdas")),
        ]);
        if (snapU.exists()) setUnidades(snapU.data().value||[]);
        if (snapR.exists()) setRdas(snapR.data().value||[]);
      } catch(e) { console.warn(e); }
      setLoading(false);
    };
    load();
  }, []);

  const salvarUnidades = async (lista) => { setUnidades(lista); await setDoc(doc(db,"app_data","traslado_unidades"),{value:lista}); };
  const salvarRdas     = async (lista) => { setRdas(lista);     await setDoc(doc(db,"app_data","traslado_rdas"),    {value:lista}); };

  const inp = { padding:"9px 13px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"13px",width:"100%",boxSizing:"border-box",fontFamily:"inherit",outline:"none" };
  const lbl = { fontSize:"11px",color:"#6e6e88",fontWeight:700,display:"block",marginBottom:"5px",letterSpacing:"0.5px",textTransform:"uppercase" };

  // ── Formulário de Unidade do Cliente ──
  const FormUnidade = ({ inicial, onSalvar, onCancelar }) => {
    const [form, setForm] = useState(inicial || { cliente:"", nomeUnidade:"", endereco:"", cidade:"", estado:"", kmConsultoria:0, observacoes:"" });
    const set = (k,v) => setForm(p=>({...p,[k]:v}));
    return (
      <div style={{ background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e",padding:"22px",maxWidth:"640px",marginBottom:"20px" }}>
        <h3 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"15px",fontWeight:900,color:"#f0f0fa",margin:"0 0 18px" }}>
          {inicial?"✏️ Editar Unidade":"🏢 Cadastrar Unidade do Cliente"}
        </h3>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
          <div>
            <label style={lbl}>Cliente *</label>
            <select value={form.cliente} onChange={e=>set("cliente",e.target.value)} style={inp}>
              <option value="">Selecione...</option>
              {(clientList||[]).map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Nome / Identificação da Unidade *</label>
            <input value={form.nomeUnidade} onChange={e=>set("nomeUnidade",e.target.value)} placeholder="Ex: Matriz, Filial SP, Unidade Norte" style={inp}/>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Endereço completo *</label>
            <input value={form.endereco} onChange={e=>set("endereco",e.target.value)} placeholder="Rua, número, bairro" style={inp}/>
          </div>
          <div>
            <label style={lbl}>Cidade</label>
            <input value={form.cidade} onChange={e=>set("cidade",e.target.value)} placeholder="Ex: São Paulo" style={inp}/>
          </div>
          <div>
            <label style={lbl}>Estado</label>
            <select value={form.estado} onChange={e=>set("estado",e.target.value)} style={inp}>
              <option value="">UF</option>
              {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Distância da consultoria (KM) *</label>
            <input type="number" min="0" step="0.1" value={form.kmConsultoria} onChange={e=>set("kmConsultoria",e.target.value)} placeholder="0" style={inp}/>
          </div>
          <div>
            <label style={lbl}>Valor KM (R$)</label>
            <input type="number" min="0" step="0.01" value={form.valorKm||""} onChange={e=>set("valorKm",e.target.value)} placeholder="Ex: 0,35" style={inp}/>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Observações</label>
            <input value={form.observacoes} onChange={e=>set("observacoes",e.target.value)} placeholder="Informações adicionais" style={inp}/>
          </div>
        </div>
        <div style={{ display:"flex",gap:"10px",marginTop:"16px",justifyContent:"flex-end" }}>
          <button onClick={onCancelar} style={{ padding:"8px 18px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontWeight:600,fontSize:"13px",fontFamily:"inherit" }}>Cancelar</button>
          <button onClick={()=>onSalvar(form)} disabled={!form.cliente||!form.nomeUnidade||!form.endereco}
            style={{ padding:"8px 22px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"13px",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44",opacity:(!form.cliente||!form.nomeUnidade||!form.endereco)?0.5:1 }}>
            💾 Salvar
          </button>
        </div>
      </div>
    );
  };

  // ── Formulário RDA ──
  const FormRDA = ({ inicial, onSalvar, onCancelar, unidadesCadastradas, projetosCadastrados }) => {
    const hoje = new Date().toISOString().slice(0,10);
    const [form, setForm] = useState(inicial || {
      codRda:"", dataEmissao:hoje, dataInicio:"", dataFinal:"",
      codTecnico: codTecnico, nomeSolicitante: nomeLogado,
      motivo: MOTIVOS_RDA[0], despesas:"", unidadeOrigem:"TOTVS SERRA DO MAR",
      codCliente:"", loja:"", nomeCliente:"", projeto:"", nomeProjeto:"",
      centroCusto:"", observacoes:"", itens:[], status:"rascunho",
    });
    const set = (k,v) => setForm(p=>({...p,[k]:v}));
    const [buscaItem, setBuscaItem] = useState("");
    const [showBuscaItem, setShowBuscaItem] = useState(null); // índice do item com busca aberta

    const addItem = () => setForm(p=>({...p, itens:[...p.itens, { id:Date.now().toString(36), data:"", codItem:"", descItem:"", qtd:"", valorUnit:"", valorTeto:"", total:0, observacao:"", foto:null }]}));
    const removeItem = (idx) => setForm(p=>({...p, itens:p.itens.filter((_,i)=>i!==idx)}));
    const setItem = (idx,k,v) => {
      setForm(p=>({...p, itens:p.itens.map((it,i)=>{
        if (i!==idx) return it;
        const updated = {...it,[k]:v};
        if (k==="qtd"||k==="valorUnit") updated.total = (Number(k==="qtd"?v:it.qtd)||0)*(Number(k==="valorUnit"?v:it.valorUnit)||0);
        return updated;
      })}));
    };
    const selecionarItem = (idx, item) => {
      setItem(idx,"codItem",item.cod);
      setItem(idx,"descItem",item.desc);
      setShowBuscaItem(null); setBuscaItem("");
    };

    // Buscar unidade do cliente ao selecionar
    const handleClienteChange = (nome) => {
      set("nomeCliente",nome);
      const cli = (clientList||[]).find(c=>c.name===nome);
      if (cli?.codigo) set("codCliente",cli.codigo);
      const un = unidadesCadastradas.filter(u=>u.cliente===nome);
      if (un.length===1) { set("unidadeDestino",un[0].nomeUnidade); }
    };

    const totalGeral = form.itens.reduce((s,it)=>s+Number(it.total||0),0);
    const itensFiltrados = ITENS_DESPESA.filter(i=>!buscaItem||i.desc.includes(buscaItem.toUpperCase())||i.cod.includes(buscaItem));

    const secHeader = (label, color="#6c63ff", icon="") => (
      <div style={{ background:"#09090f",borderRadius:"10px 10px 0 0",padding:"10px 16px",display:"flex",alignItems:"center",gap:"8px",marginTop:"20px",marginBottom:0,border:"1px solid #2a2a3a",borderBottom:"none" }}>
        <span style={{ fontSize:"16px" }}>{icon}</span>
        <span style={{ fontSize:"12px",fontWeight:800,color:"#fff",letterSpacing:"1px",textTransform:"uppercase" }}>{label}</span>
      </div>
    );
    const secBody = { background:"#111118",borderRadius:"0 0 10px 10px",border:"1px solid #2a2a3a",padding:"16px",marginBottom:"4px" };

    return (
      <div style={{ maxWidth:"900px" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px",flexWrap:"wrap",gap:"10px" }}>
          <h3 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"17px",fontWeight:900,color:"#f0f0fa",margin:0 }}>
            {inicial?"✏️ Editar RDA":"🚗 Nova RDA — Relatório de Despesas de Atendimento"}
          </h3>
          <div style={{ display:"flex",gap:"8px" }}>
            <button onClick={onCancelar} style={{ padding:"8px 16px",borderRadius:"9px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontWeight:600,fontSize:"12px",fontFamily:"inherit" }}>Cancelar</button>
            <button onClick={()=>onSalvar({...form,status:"rascunho"})}
              style={{ padding:"8px 16px",borderRadius:"9px",border:"1px solid #6c63ff44",background:"#6c63ff18",color:"#a78bfa",cursor:"pointer",fontWeight:700,fontSize:"12px",fontFamily:"inherit" }}>💾 Salvar rascunho</button>
            <button onClick={()=>onSalvar({...form,status:"enviada"})}
              style={{ padding:"8px 18px",borderRadius:"9px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"12px",fontFamily:"inherit",boxShadow:"0 4px 14px #6c63ff44" }}>✅ Enviar RDA</button>
          </div>
        </div>

        {/* Seção RDA */}
        {secHeader("RDA — Relatório de Despesas de Atendimento","#6c63ff","🚗")}
        <div style={secBody}>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px" }}>
            <div>
              <label style={lbl}>Código RDA</label>
              <input value={form.codRda||"Gerado automaticamente"} readOnly style={{...inp,background:"#0a0a12",color:"#6e6e88"}}/>
            </div>
            <div>
              <label style={lbl}>Data Emissão</label>
              <input type="date" value={form.dataEmissao} readOnly style={{...inp,background:"#0a0a12",color:"#6e6e88"}}/>
            </div>
            <div>
              <label style={lbl}>Data Início *</label>
              <input type="date" value={form.dataInicio} onChange={e=>set("dataInicio",e.target.value)} style={inp}/>
            </div>
            <div>
              <label style={lbl}>Data Final *</label>
              <input type="date" value={form.dataFinal} onChange={e=>set("dataFinal",e.target.value)} style={inp}/>
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"160px 1fr 1fr",gap:"10px",marginTop:"10px" }}>
            <div>
              <label style={lbl}>Cód. Técnico</label>
              <input value={form.codTecnico} readOnly style={{...inp,background:"#0a0a12",color:"#a78bfa",fontWeight:700}}/>
            </div>
            <div>
              <label style={lbl}>Nome Solicitante *</label>
              <input value={form.nomeSolicitante} onChange={e=>set("nomeSolicitante",e.target.value)} style={inp}/>
            </div>
            <div>
              <label style={lbl}>Motivo *</label>
              <select value={form.motivo} onChange={e=>set("motivo",e.target.value)} style={inp}>
                {MOTIVOS_RDA.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop:"10px" }}>
            <label style={lbl}>Unidade de Origem *</label>
            <select value={form.unidadeOrigem} onChange={e=>set("unidadeOrigem",e.target.value)} style={{...inp,maxWidth:"320px"}}>
              <option value="TOTVS SERRA DO MAR">TOTVS SERRA DO MAR</option>
              <option value="TOTVS SÃO JOSÉ">TOTVS SÃO JOSÉ</option>
              <option value="TOTVS SUL DE MINAS">TOTVS SUL DE MINAS</option>
            </select>
          </div>
        </div>

        {/* Seção Cliente */}
        {secHeader("CLIENTE","#22d3a0","🏢")}
        <div style={secBody}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 120px 1fr",gap:"10px",marginBottom:"10px" }}>
            <div>
              <label style={lbl}>Nome Cliente</label>
              <select value={form.nomeCliente} onChange={e=>handleClienteChange(e.target.value)} style={inp}>
                <option value="">Preencha com o nome do cliente</option>
                {(clientList||[]).map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Código Cliente</label>
              <input value={form.codCliente} onChange={e=>set("codCliente",e.target.value)} placeholder="" style={inp}/>
            </div>
            <div>
              <label style={lbl}>Loja</label>
              <input value={form.loja} onChange={e=>set("loja",e.target.value)} placeholder="" style={inp}/>
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"220px 1fr 160px",gap:"10px",marginBottom:"10px" }}>
            <div>
              <label style={lbl}>Unidade de Destino</label>
              <select value={form.unidadeDestino||""} onChange={e=>{
                const nomeSel = e.target.value;
                set("unidadeDestino", nomeSel);
                const un = unidadesCadastradas.find(u=>u.nomeUnidade===nomeSel&&u.cliente===form.nomeCliente);
                if (un) {
                  set("enderecoDestino", un.endereco||"");
                  const kmIda = Number(un.kmConsultoria)||0;
                  const kmTotal = kmIda * 2;
                  set("kmDestino", String(kmIda));
                  set("kmTotal", String(kmTotal));
                  const valorKm = Number(un.valorKm)||0;
                  if (valorKm > 0) set("valorTotalKm", (kmTotal * valorKm).toFixed(2));
                }
              }} style={inp}>
                <option value="">Selecione...</option>
                {unidadesCadastradas.filter(u=>!form.nomeCliente||u.cliente===form.nomeCliente).map(u=>(
                  <option key={u.id} value={u.nomeUnidade}>{u.nomeUnidade} — {u.kmConsultoria}km</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Endereço destino</label>
              <input value={form.enderecoDestino||""} onChange={e=>set("enderecoDestino",e.target.value)} placeholder="Preenchido automaticamente" style={inp}/>
            </div>
            <div>
              <label style={lbl}>KM IDA e VOLTA</label>
              <input type="number" value={form.kmDestino||""} onChange={e=>{
                const kmIda = Number(e.target.value)||0;
                set("kmDestino", e.target.value);
                set("kmTotal", String(kmIda*2));
                const un = unidadesCadastradas.find(u=>u.nomeUnidade===form.unidadeDestino&&u.cliente===form.nomeCliente);
                const valorKm = Number(un?.valorKm)||0;
                if (valorKm > 0) set("valorTotalKm", (kmIda*2*valorKm).toFixed(2));
              }} placeholder="KM (ida)" style={inp}/>
              {form.kmDestino && (
                <div style={{ fontSize:"10px",color:"#22d3a0",marginTop:"3px",lineHeight:1.6 }}>
                  ↔ Total: <strong>{(Number(form.kmDestino)*2).toFixed(0)} km</strong>
                  {form.valorTotalKm && <span style={{ marginLeft:"8px",color:"#a78bfa" }}>· R$ {form.valorTotalKm}</span>}
                </div>
              )}
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 160px",gap:"10px",marginBottom:"10px" }}>
            <div>
              <label style={lbl}>Projeto</label>
              <select value={form.projeto} onChange={e=>{
                set("projeto",e.target.value);
                const proj = (projetosCadastrados||[]).find(p=>p.name===e.target.value || p.codigo===e.target.value);
                if (proj) { set("nomeProjeto", proj.name||""); }
              }} style={inp}>
                <option value="">Selecione o projeto...</option>
                {(projetosCadastrados||[]).map(p=>(
                  <option key={p.name} value={p.codigo||p.name}>
                    {p.codigo ? `${p.codigo} — ${p.name}` : p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Nome Projeto</label>
              <input value={form.nomeProjeto} onChange={e=>set("nomeProjeto",e.target.value)} style={{...inp,background:"#18181f",color:"#a78bfa"}} placeholder="Preenchido automaticamente"/>
            </div>
            <div>
              <label style={lbl}>Centro Custo *</label>
              <input value={form.centroCusto} onChange={e=>set("centroCusto",e.target.value)} placeholder="Ex: 1030003" style={inp}/>
            </div>
          </div>
          <div>
            <label style={lbl}>Observações *</label>
            <textarea value={form.observacoes} onChange={e=>set("observacoes",e.target.value)} rows={2} style={{...inp,resize:"vertical",lineHeight:1.5}}/>
          </div>
        </div>

        {/* Seção Declarações de Itens */}
        {secHeader("DECLARAÇÕES DE ITENS","#f5a623","$")}
        <div style={secBody}>
          {form.itens.map((item,idx)=>(
            <div key={item.id||idx} style={{ background:"#0d0d14",borderRadius:"10px",border:"1px solid #2a2a3a",padding:"14px",marginBottom:"10px" }}>
              <div style={{ display:"grid",gridTemplateColumns:"160px 120px 1fr",gap:"10px",marginBottom:"10px",alignItems:"end" }}>
                <div>
                  <label style={lbl}>Data Item *</label>
                  <input type="date" value={item.data} onChange={e=>setItem(idx,"data",e.target.value)} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Cód. Item *</label>
                  <input value={item.codItem} readOnly style={{...inp,background:"#18181f",color:"#a78bfa",fontWeight:700}}/>
                </div>
                <div style={{ position:"relative" }}>
                  <label style={lbl}>Descrição Item *</label>
                  <div style={{ display:"flex",gap:"6px" }}>
                    <input value={item.descItem} readOnly placeholder="Selecione o item" style={{...inp,flex:1,background:"#18181f"}}/>
                    <button onClick={()=>{ setShowBuscaItem(showBuscaItem===idx?null:idx); setBuscaItem(""); }}
                      style={{ padding:"9px 12px",borderRadius:"9px",border:"1px solid #2a2a3a",background:"#18181f",color:"#6e6e88",cursor:"pointer",fontSize:"14px" }}>🔍</button>
                  </div>
                  {showBuscaItem===idx && (
                    <div style={{ position:"absolute",top:"100%",left:0,right:0,zIndex:200,background:"#111118",border:"1px solid #2a2a3a",borderRadius:"10px",boxShadow:"0 8px 32px rgba(0,0,0,0.6)",marginTop:"4px",maxHeight:"240px",overflowY:"auto" }}>
                      <div style={{ padding:"8px" }}>
                        <input value={buscaItem} onChange={e=>setBuscaItem(e.target.value)} placeholder="Buscando..." autoFocus style={{...inp,fontSize:"12px"}}/>
                      </div>
                      <div style={{ padding:"4px 8px 8px",fontSize:"10px",color:"#3e3e55",fontWeight:700,letterSpacing:"0.5px",display:"grid",gridTemplateColumns:"100px 1fr",paddingLeft:"12px" }}>
                        <span>CÓDIGO</span><span>DESCRIÇÃO</span>
                      </div>
                      {itensFiltrados.map(it=>(
                        <div key={it.cod} onClick={()=>selecionarItem(idx,it)}
                          style={{ display:"grid",gridTemplateColumns:"100px 1fr",padding:"10px 12px",cursor:"pointer",borderTop:"1px solid #1f1f2e",transition:"background .1s" }}
                          onMouseEnter={e=>e.currentTarget.style.background="#18181f"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <span style={{ fontSize:"12px",fontWeight:700,color:"#a78bfa" }}>{it.cod}</span>
                          <span style={{ fontSize:"12px",color:"#f0f0fa",fontWeight:700 }}>{it.desc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 140px 140px 140px 140px",gap:"10px",alignItems:"end" }}>
                <div>
                  <label style={lbl}>Observação</label>
                  <input value={item.observacao} onChange={e=>setItem(idx,"observacao",e.target.value)} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>QTD *</label>
                  <input type="number" min="0" step="0.01" value={item.qtd} onChange={e=>setItem(idx,"qtd",e.target.value)} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Valor Unit *</label>
                  <input type="number" min="0" step="0.01" value={item.valorUnit} onChange={e=>setItem(idx,"valorUnit",e.target.value)} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Valor Teto *</label>
                  <input type="number" min="0" step="0.01" value={item.valorTeto} onChange={e=>setItem(idx,"valorTeto",e.target.value)} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Total *</label>
                  <input value={item.total?Number(item.total).toFixed(2):""} readOnly style={{...inp,background:"#18181f",color:"#22d3a0",fontWeight:800}}/>
                </div>
              </div>
              <div style={{ display:"flex",gap:"8px",marginTop:"10px" }}>
                <label style={{ padding:"6px 14px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#18181f",color:"#6e6e88",fontSize:"11px",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
                  📷 INSIRA FOTO
                  <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>setItem(idx,"foto",e.target.files[0]?.name||null)}/>
                </label>
                {item.foto && <span style={{ fontSize:"11px",color:"#22d3a0",alignSelf:"center" }}>📎 {item.foto}</span>}
                <button onClick={()=>removeItem(idx)} style={{ padding:"6px 14px",borderRadius:"8px",border:"1px solid #f04f5e44",background:"#f04f5e18",color:"#f04f5e",fontSize:"11px",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>REMOVER ITEM</button>
              </div>
            </div>
          ))}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:"8px" }}>
            <button onClick={addItem} style={{ padding:"9px 20px",borderRadius:"9px",border:"1px solid #2a2a3a",background:"#18181f",color:"#c8c8d8",fontSize:"12px",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>+ NOVA DESPESA</button>
            {(form.itens.length>0 || form.valorTotalKm) && (
              <div style={{ fontSize:"14px",fontWeight:800,color:"#22d3a0" }}>
                Total Geral: R$ {(totalGeral + Number(form.valorTotalKm||0)).toFixed(2)}
                {form.valorTotalKm && form.itens.length>0 && <span style={{ fontSize:"11px",color:"#6e6e88",fontWeight:400,marginLeft:"8px" }}>(itens: R$ {totalGeral.toFixed(2)} + km: R$ {Number(form.valorTotalKm).toFixed(2)})</span>}
              </div>
            )}
          </div>
        </div>

        {/* Seção Comprovantes */}
        {secHeader("COMPROVANTES","#a78bfa","📎")}
        <div style={secBody}>
          <div style={{ fontSize:"11px",color:"#6e6e88",marginBottom:"12px" }}>
            Anexe os comprovantes das despesas declaradas (imagens ou PDFs, máx. 5MB cada)
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
            {(form.comprovantes||[]).map((comp,idx)=>(
              <div key={idx} style={{ display:"flex",alignItems:"center",gap:"10px",background:"#0d0d14",borderRadius:"8px",border:"1px solid #2a2a3a",padding:"9px 12px" }}>
                <span style={{ fontSize:"16px" }}>{comp.tipo==="pdf"?"📄":"🖼"}</span>
                <span style={{ fontSize:"12px",color:"#c8c8d8",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{comp.nome}</span>
                {comp.url && (
                  <a href={comp.url} target="_blank" rel="noreferrer"
                    style={{ padding:"4px 10px",borderRadius:"7px",border:"1px solid #22d3a044",background:"#22d3a018",color:"#22d3a0",fontSize:"11px",fontWeight:700,textDecoration:"none" }}>
                    👁 Ver
                  </a>
                )}
                <button onClick={()=>setForm(p=>({...p,comprovantes:p.comprovantes.filter((_,i)=>i!==idx)}))}
                  style={{ padding:"4px 9px",borderRadius:"7px",border:"1px solid #f04f5e44",background:"#f04f5e18",color:"#f04f5e",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"inherit" }}>✕</button>
              </div>
            ))}
          </div>
          <label style={{ display:"inline-flex",alignItems:"center",gap:"8px",marginTop:"10px",padding:"9px 18px",borderRadius:"10px",border:"1px solid #6c63ff44",background:"#6c63ff18",color:"#a78bfa",fontSize:"12px",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
            📎 Adicionar comprovante
            <input type="file" accept="image/*,application/pdf" multiple style={{ display:"none" }}
              onChange={async (e) => {
                const files = Array.from(e.target.files||[]);
                const novos = [];
                for (const file of files) {
                  if (file.size > 5*1024*1024) { alert(`${file.name}: arquivo muito grande (máx 5MB)`); continue; }
                  try {
                    const path = `rdas/${Date.now()}_${file.name.replace(/\s+/g,"_")}`;
                    const sRef = ref(storage, path);
                    await uploadBytes(sRef, file, { contentType: file.type });
                    const url = await getDownloadURL(sRef);
                    novos.push({ nome: file.name, url, path, tipo: file.type.startsWith("image")?"imagem":"pdf" });
                  } catch(err) { console.error(err); alert(`Erro ao enviar ${file.name}`); }
                }
                if (novos.length) setForm(p=>({...p, comprovantes:[...(p.comprovantes||[]),...novos]}));
                e.target.value = "";
              }}/>
          </label>
          <div style={{ fontSize:"10px",color:"#3e3e55",marginTop:"6px" }}>Formatos: imagens (JPG, PNG) e PDF · Máximo 5MB por arquivo</div>
        </div>
      </div>
    );
  };

  const STATUS_RDA = {
    rascunho: { label:"Rascunho", color:"#6e6e88", bg:"#6e6e8818" },
    enviada:  { label:"Enviada",  color:"#6c63ff", bg:"#6c63ff18" },
    aprovada: { label:"Aprovada", color:"#22d3a0", bg:"#22d3a018" },
    rejeitada:{ label:"Rejeitada",color:"#f04f5e", bg:"#f04f5e18" },
  };

  const rdasFiltradas = isConsultor
    ? rdas.filter(r => r.nomeSolicitante===nomeLogado || r.codTecnico===codTecnico)
    : filtroCliente ? rdas.filter(r=>r.nomeCliente===filtroCliente) : rdas;

  if (loading) return <div style={{ textAlign:"center",padding:"60px" }}><div style={{ width:"28px",height:"28px",border:"3px solid #1f1f2e",borderTop:"3px solid #6c63ff",borderRadius:"50%",animation:"spin .7s linear infinite",margin:"0 auto" }}/></div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"24px",flexWrap:"wrap",gap:"12px" }}>
        <div>
          <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:900,color:"#f0f0fa",margin:"0 0 4px",letterSpacing:"-0.3px" }}>🚗 Traslado</h2>
          <p style={{ fontSize:"12px",color:"#3e3e55",margin:0 }}>{rdasFiltradas.length} RDA{rdasFiltradas.length!==1?"s":""}</p>
        </div>
        <div style={{ display:"flex",gap:"6px",alignItems:"center" }}>
          <div style={{ display:"flex",gap:"2px",background:"#0d0d14",borderRadius:"10px",padding:"3px",border:"1px solid #2a2a3a" }}>
            {[{id:"rda",l:"📄 RDAs"},{id:"cadastro",l:"🏢 Unidades"}].map(t=>(
              <button key={t.id} onClick={()=>setAba(t.id)}
                style={{ padding:"6px 14px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"12px",fontFamily:"inherit",background:aba===t.id?"#6c63ff":"transparent",color:aba===t.id?"#fff":"#6e6e88" }}>{t.l}</button>
            ))}
          </div>
          {aba==="rda" && <button onClick={()=>{setEditRda(null);setShowFormRda(true);}}
            style={{ padding:"8px 18px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",fontWeight:700,fontSize:"12px",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44" }}>+ Nova RDA</button>}
          {aba==="cadastro" && (canManage||canApprove) && <button onClick={()=>{setEditUn(null);setShowFormUn(true);}}
            style={{ padding:"8px 18px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",fontWeight:700,fontSize:"12px",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44" }}>+ Nova Unidade</button>}
        </div>
      </div>

      {/* ABA: CADASTRO DE UNIDADES */}
      {aba==="cadastro" && (
        <div>
          {showFormUn && (
            <FormUnidade inicial={editUn}
              onSalvar={async (dados)=>{
                const nova = editUn
                  ? unidades.map(u=>u.id===editUn.id?{...dados,id:editUn.id}:u)
                  : [...unidades,{...dados,id:Date.now().toString(36)}];
                await salvarUnidades(nova);
                setShowFormUn(false); setEditUn(null);
              }}
              onCancelar={()=>{setShowFormUn(false);setEditUn(null);}}
            />
          )}
          {/* Filtro por cliente */}
          <div style={{ marginBottom:"14px" }}>
            <select value={filtroCliente} onChange={e=>setFiltroCliente(e.target.value)}
              style={{...inp,maxWidth:"280px"}}>
              <option value="">Todos os clientes</option>
              {[...new Set(unidades.map(u=>u.cliente))].sort().map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {unidades.length===0 && !showFormUn && (
            <div style={{ textAlign:"center",padding:"60px",background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e" }}>
              <div style={{ fontSize:"40px",marginBottom:"12px" }}>🏢</div>
              <div style={{ fontSize:"14px",color:"#3e3e55",marginBottom:"16px" }}>Nenhuma unidade cadastrada</div>
              {(canManage||canApprove) && <button onClick={()=>setShowFormUn(true)} style={{ padding:"9px 20px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontFamily:"inherit" }}>Cadastrar primeira unidade</button>}
            </div>
          )}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"12px" }}>
            {(filtroCliente?unidades.filter(u=>u.cliente===filtroCliente):unidades).map(un=>{
              const cli = (clientList||[]).find(c=>c.name===un.cliente);
              return (
                <div key={un.id} style={{ background:"#111118",borderRadius:"12px",border:"1px solid #1f1f2e",padding:"16px",position:"relative",overflow:"hidden" }}>
                  <div style={{ position:"absolute",top:0,left:0,right:0,height:"3px",background:cli?.color||"#6c63ff" }}/>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px" }}>
                    <div>
                      <div style={{ fontSize:"13px",fontWeight:700,color:"#f0f0fa" }}>{un.nomeUnidade}</div>
                      <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"2px" }}>🏢 {un.cliente}</div>
                    </div>
                    {(canManage||canApprove) && (
                      <div style={{ display:"flex",gap:"5px" }}>
                        <button onClick={()=>{setEditUn(un);setShowFormUn(true);}} style={{ padding:"4px 9px",borderRadius:"7px",border:"1px solid #6c63ff44",background:"#6c63ff18",color:"#a78bfa",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"inherit" }}>✏️</button>
                        <button onClick={async()=>{ if(window.confirm("Excluir?")) await salvarUnidades(unidades.filter(u2=>u2.id!==un.id)); }} style={{ padding:"4px 9px",borderRadius:"7px",border:"1px solid #f04f5e44",background:"#f04f5e18",color:"#f04f5e",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"inherit" }}>🗑</button>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize:"12px",color:"#c8c8d8",marginBottom:"4px" }}>📍 {un.endereco}{un.cidade?", "+un.cidade:""}{un.estado?" / "+un.estado:""}</div>
                  <div style={{ display:"flex",gap:"14px",fontSize:"11px",color:"#6e6e88",marginTop:"6px" }}>
                    <span style={{ color:"#22d3a0",fontWeight:700 }}>🚗 {un.kmConsultoria} km</span>
                    {un.valorKm && <span>R$ {Number(un.valorKm).toFixed(2)}/km</span>}
                    {un.observacoes && <span>💬 {un.observacoes}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA: RDAs */}
      {aba==="rda" && (
        <div>
          {showFormRda && (
            <FormRDA inicial={editRda}
              unidadesCadastradas={unidades}
              projetosCadastrados={projects||[]}
              onSalvar={async (dados)=>{
                // Gerar código RDA sequencial
                let codRda = dados.codRda;
                if (!codRda) {
                  try {
                    const snap = await getDoc(doc(db,"app_data","rda_sequencial"));
                    const n = snap.exists()?(snap.data().value||0):0;
                    codRda = "RDA-"+String(n+1).padStart(5,"0");
                    await setDoc(doc(db,"app_data","rda_sequencial"),{value:n+1});
                  } catch(_) { codRda = "RDA-"+Date.now().toString().slice(-5); }
                }
                const final = {...dados,codRda};
                const nova = editRda
                  ? rdas.map(r=>r.id===editRda.id?{...final,id:editRda.id}:r)
                  : [...rdas,{...final,id:Date.now().toString(36),criadoEm:new Date().toISOString()}];
                await salvarRdas(nova);
                setShowFormRda(false); setEditRda(null);
              }}
              onCancelar={()=>{setShowFormRda(false);setEditRda(null);}}
            />
          )}

          {!showFormRda && (
            <>
              {!isConsultor && (
                <div style={{ marginBottom:"14px" }}>
                  <select value={filtroCliente} onChange={e=>setFiltroCliente(e.target.value)} style={{...inp,maxWidth:"260px"}}>
                    <option value="">Todos os clientes</option>
                    {[...new Set(rdas.map(r=>r.nomeCliente).filter(Boolean))].sort().map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {rdasFiltradas.length===0 && (
                <div style={{ textAlign:"center",padding:"60px",background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e" }}>
                  <div style={{ fontSize:"40px",marginBottom:"12px" }}>🚗</div>
                  <div style={{ fontSize:"14px",color:"#3e3e55",marginBottom:"16px" }}>Nenhuma RDA encontrada</div>
                  <button onClick={()=>setShowFormRda(true)} style={{ padding:"9px 20px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontFamily:"inherit" }}>Criar primeira RDA</button>
                </div>
              )}

              <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
                {rdasFiltradas.sort((a,b)=>new Date(b.criadoEm||0)-new Date(a.criadoEm||0)).map(rda=>{
                  const st = STATUS_RDA[rda.status]||STATUS_RDA.rascunho;
                  const total = (rda.itens||[]).reduce((s,it)=>s+Number(it.total||0),0);
                  return (
                    <div key={rda.id} style={{ background:"#111118",borderRadius:"12px",border:"1px solid #1f1f2e",padding:"14px 18px",display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap" }}>
                      <div style={{ minWidth:"100px" }}>
                        <div style={{ fontSize:"12px",fontWeight:800,color:"#a78bfa" }}>{rda.codRda||"—"}</div>
                        <div style={{ fontSize:"10px",color:"#3e3e55",marginTop:"2px" }}>{rda.dataEmissao}</div>
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:"13px",fontWeight:700,color:"#f0f0fa" }}>{rda.nomeCliente||"(sem cliente)"}</div>
                        <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"2px",display:"flex",gap:"10px",flexWrap:"wrap" }}>
                          <span>👤 {rda.nomeSolicitante}</span>
                          <span>📅 {rda.dataInicio}{rda.dataFinal?" → "+rda.dataFinal:""}</span>
                          <span>📌 {rda.motivo?.split(" - ")[1]||rda.motivo}</span>
                          {total>0&&<span style={{ color:"#22d3a0",fontWeight:700 }}>R$ {total.toFixed(2)}</span>}
                        </div>
                      </div>
                      <span style={{ padding:"4px 12px",borderRadius:"99px",background:st.bg,border:"1px solid "+st.color+"44",fontSize:"11px",fontWeight:700,color:st.color,whiteSpace:"nowrap" }}>{st.label}</span>
                      <div style={{ display:"flex",gap:"6px" }}>
                        <button onClick={()=>{setEditRda(rda);setShowFormRda(true);}}
                          style={{ padding:"6px 12px",borderRadius:"8px",border:"1px solid #6c63ff44",background:"#6c63ff18",color:"#a78bfa",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"inherit" }}>
                          {rda.status==="rascunho"?"✏️ Editar":"👁 Ver"}
                        </button>
                        {(canManage||canApprove) && (
                          <>
                            {rda.status==="enviada"&&<button onClick={async()=>{ await salvarRdas(rdas.map(r=>r.id===rda.id?{...r,status:"aprovada"}:r)); }} style={{ padding:"6px 12px",borderRadius:"8px",border:"1px solid #22d3a044",background:"#22d3a018",color:"#22d3a0",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"inherit" }}>✅ Aprovar</button>}
                            {rda.status==="enviada"&&<button onClick={async()=>{ await salvarRdas(rdas.map(r=>r.id===rda.id?{...r,status:"rejeitada"}:r)); }} style={{ padding:"6px 12px",borderRadius:"8px",border:"1px solid #f04f5e44",background:"#f04f5e18",color:"#f04f5e",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"inherit" }}>❌ Rejeitar</button>}
                          </>
                        )}
                        {rda.status==="rascunho"&&<button onClick={async()=>{ if(window.confirm("Excluir esta RDA?")) await salvarRdas(rdas.filter(r=>r.id!==rda.id)); }} style={{ padding:"6px 12px",borderRadius:"8px",border:"1px solid #f04f5e44",background:"#f04f5e18",color:"#f04f5e",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"inherit" }}>🗑</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const ROLES_LABELS = {
  admin:"Admin", editor:"Editor", viewer:"Visualizador",
  diretor_executivo:"Diretor Executivo", diretor:"Diretor",
  gerente_executivo:"Gerente Executivo", gerente:"Gerente",
  coordenador:"Coordenador", consultor:"Consultor", administrativo:"Administrativo",
};

const TIPOS_SOLICITACAO = [
  { id:"viagem",   label:"Viagem e Hospedagem", icon:"🏨" },
  { id:"os",       label:"Ordem de Serviço",    icon:"📋" },
  { id:"projeto",  label:"Projeto",             icon:"📁" },
];

function ModuloAlcadas({ currentUser, canManage, canApprove, consultores, usuarios, theme: T }) {
  const [aba,           setAba]           = useState("kanban");   // kanban | cadastro
  const [alcadas,       setAlcadas]       = useState([]);
  const [solicitacoes,  setSolicitacoes]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [editAlcada,    setEditAlcada]    = useState(null);
  const [showFormAlc,   setShowFormAlc]   = useState(false);
  const [filtroTipo,    setFiltroTipo]    = useState("");
  const [filtroStatus,  setFiltroStatus]  = useState("");
  const [comentario,    setComentario]    = useState("");
  const [acaoSel,       setAcaoSel]       = useState(null); // {solId, acao}

  const nomeUsuario = currentUser.nome || currentUser.username || currentUser.consultorName || "";
  const roleUsuario = currentUser.role || "viewer";

  // ── Carregar alçadas e solicitações ──
  useEffect(() => {
    const load = async () => {
      try {
        const [snapAlc, snapSol] = await Promise.all([
          getDoc(doc(db,"app_data","alcadas_config")),
          getDoc(doc(db,"app_data","alcadas_solicitacoes")),
        ]);
        if (snapAlc.exists()) setAlcadas(snapAlc.data().value || []);
        if (snapSol.exists()) setSolicitacoes(snapSol.data().value || []);
      } catch(e) { console.warn(e); }
      setLoading(false);
    };
    load();
  }, []);

  const salvarAlcadas = async (lista) => {
    setAlcadas(lista);
    await setDoc(doc(db,"app_data","alcadas_config"), { value: lista });
  };
  const salvarSolicitacoes = async (lista) => {
    setSolicitacoes(lista);
    await setDoc(doc(db,"app_data","alcadas_solicitacoes"), { value: lista });
  };

  // ── Encontrar alçada aplicável para um tipo ──
  const getAlcada = (tipo) => alcadas.find(a => a.tipo === tipo && a.ativa);

  // ── Criar nova solicitação no fluxo ──
  const criarSolicitacao = async (tipo, dados) => {
    const alc = getAlcada(tipo);
    if (!alc) return null;
    const sol = {
      id: Date.now().toString(36),
      tipo, dados,
      alcadaId: alc.id,
      niveis: alc.niveis,
      nivelAtual: 0,
      status: "em_aprovacao",
      historico: [{ acao:"criado", por: nomeUsuario, role: roleUsuario, em: new Date().toISOString() }],
      criadoPor: nomeUsuario,
      criadoEm: new Date().toISOString(),
    };
    const novas = [...solicitacoes, sol];
    await salvarSolicitacoes(novas);
    return sol;
  };

  // ── Aprovar / Rejeitar / Devolver nível atual ──
  const processarAcao = async (solId, acao, obs) => {
    const sol = solicitacoes.find(s => s.id === solId);
    if (!sol) return;
    const nivel = sol.niveis[sol.nivelAtual];
    const hist = [...sol.historico, {
      acao, nivel: nivel?.cargo, por: nomeUsuario, role: roleUsuario,
      obs, em: new Date().toISOString(),
    }];

    let novoStatus = sol.status;
    let novoNivel  = sol.nivelAtual;

    if (acao === "aprovado") {
      if (sol.nivelAtual >= sol.niveis.length - 1) {
        novoStatus = "aprovado"; // todos os níveis aprovaram
      } else {
        novoNivel  = sol.nivelAtual + 1;
        novoStatus = "em_aprovacao";
      }
    } else if (acao === "rejeitado") {
      novoStatus = "rejeitado";
    } else if (acao === "devolvido") {
      novoNivel  = Math.max(0, sol.nivelAtual - 1);
      novoStatus = "em_aprovacao";
    }

    const updated = { ...sol, nivelAtual: novoNivel, status: novoStatus, historico: hist, atualizadoEm: new Date().toISOString() };
    const novas = solicitacoes.map(s => s.id === solId ? updated : s);
    await salvarSolicitacoes(novas);

    // ── Aprovação final: atualizar viagem e notificar consultor ──
    if (novoStatus === "aprovado" && sol.tipo === "viagem" && sol.viagemId) {
      try {
        // 1. Atualizar status da viagem em viagens_all
        const snapV = await getDoc(doc(db,"app_data","viagens_all"));
        if (snapV.exists()) {
          const listaV = (snapV.data().value||[]).map(v =>
            v.id === sol.viagemId ? {...v, status:"aprovada", avaliadoEm:new Date().toISOString()} : v
          );
          await setDoc(doc(db,"app_data","viagens_all"), { value: listaV });

          // 2. Criar notificação para o consultor
          const viagem = listaV.find(v => v.id === sol.viagemId);
          if (viagem?.consultor) {
            const keyN = "notif_viagem_" + viagem.consultor.trim().toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
              .replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
            const snapN = await getDoc(doc(db,"app_data",keyN));
            const notifs = snapN.exists() ? (snapN.data().value||[]) : [];
            const jaExiste = notifs.some(n => n.id === viagem.id);
            if (!jaExiste) {
              await setDoc(doc(db,"app_data",keyN), {
                value: [...notifs, {...viagem, status:"aprovada"}]
              });
            }
          }
        }
      } catch(e) { console.warn("Sync viagem aprovada:", e); }
    }

    // ── Rejeição: atualizar status da viagem também ──
    if (novoStatus === "rejeitado" && sol.tipo === "viagem" && sol.viagemId) {
      try {
        const snapV = await getDoc(doc(db,"app_data","viagens_all"));
        if (snapV.exists()) {
          const listaV = (snapV.data().value||[]).map(v =>
            v.id === sol.viagemId ? {...v, status:"rejeitada", comentarioGestor:obs, avaliadoEm:new Date().toISOString()} : v
          );
          await setDoc(doc(db,"app_data","viagens_all"), { value: listaV });
        }
      } catch(e) { console.warn("Sync viagem rejeitada:", e); }
    }

    setAcaoSel(null); setComentario("");
  };

  // ── Verificar se o usuário atual pode agir no nível da solicitação ──
  const podeAgir = (sol) => {
    if (sol.status !== "em_aprovacao") return false;
    const nivel = sol.niveis?.[sol.nivelAtual];
    if (!nivel) return false;
    if (canManage) return true; // admin sempre pode
    return nivel.cargo === roleUsuario || nivel.cargo === currentUser.role;
  };

  const inp = { padding:"9px 13px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"13px",width:"100%",boxSizing:"border-box",fontFamily:"inherit",outline:"none" };
  const lbl = { fontSize:"11px",color:"#6e6e88",fontWeight:700,display:"block",marginBottom:"6px",letterSpacing:"0.5px",textTransform:"uppercase" };

  const STATUS_SOL = {
    em_aprovacao: { label:"Em aprovação", color:"#6c63ff", bg:"#6c63ff18", icon:"⏳" },
    aprovado:     { label:"Aprovado",     color:"#22d3a0", bg:"#22d3a018", icon:"✅" },
    rejeitado:    { label:"Rejeitado",    color:"#f04f5e", bg:"#f04f5e18", icon:"❌" },
    devolvido:    { label:"Devolvido",    color:"#f5a623", bg:"#f5a62318", icon:"↩️" },
  };

  // ── Formulário de Cadastro de Alçada ──
  const FormAlcada = ({ inicial, onSalvar, onCancelar }) => {
    const vazio = { id:Date.now().toString(36), nome:"", tipo:"viagem", ativa:true, niveis:[] };
    const [form, setForm] = useState(inicial || vazio);
    const set = (k,v) => setForm(p=>({...p,[k]:v}));

    const addNivel = () => setForm(p=>({...p, niveis:[...p.niveis, { id:Date.now().toString(36), ordem:p.niveis.length+1, cargo:"gerente", label:"" }]}));
    const removeNivel = (idx) => setForm(p=>({...p, niveis:p.niveis.filter((_,i)=>i!==idx)}));
    const setNivel = (idx, k, v) => setForm(p=>({...p, niveis:p.niveis.map((n,i)=>i===idx?{...n,[k]:v}:n)}));
    const moveNivel = (idx, dir) => {
      const ns = [...form.niveis];
      const swap = idx + dir;
      if (swap < 0 || swap >= ns.length) return;
      [ns[idx], ns[swap]] = [ns[swap], ns[idx]];
      setForm(p=>({...p, niveis:ns.map((n,i)=>({...n,ordem:i+1}))}));
    };

    return (
      <div style={{ background:"#111118",borderRadius:"16px",border:"1px solid #1f1f2e",padding:"24px",maxWidth:"620px",marginBottom:"24px" }}>
        <h3 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"16px",fontWeight:900,color:"#f0f0fa",margin:"0 0 20px" }}>
          {inicial?"✏️ Editar Alçada":"🔀 Nova Alçada de Aprovação"}
        </h3>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"16px" }}>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Nome da alçada</label>
            <input value={form.nome} onChange={e=>set("nome",e.target.value)} placeholder="Ex: Aprovação de Viagens Nacionais" style={inp}/>
          </div>
          <div>
            <label style={lbl}>Tipo de solicitação</label>
            <select value={form.tipo} onChange={e=>set("tipo",e.target.value)} style={inp}>
              {TIPOS_SOLICITACAO.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:"10px",paddingTop:"22px" }}>
            <input type="checkbox" id="ativa_check" checked={form.ativa} onChange={e=>set("ativa",e.target.checked)} style={{ width:"16px",height:"16px",accentColor:"#6c63ff" }}/>
            <label htmlFor="ativa_check" style={{ fontSize:"13px",color:"#c8c8d8",cursor:"pointer" }}>Alçada ativa</label>
          </div>
        </div>

        {/* Níveis de aprovação */}
        <div style={{ marginBottom:"16px" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px" }}>
            <label style={lbl}>Hierarquia de aprovação</label>
            <button onClick={addNivel} style={{ padding:"5px 14px",borderRadius:"8px",border:"1px solid #6c63ff44",background:"#6c63ff18",color:"#a78bfa",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"inherit" }}>+ Nível</button>
          </div>
          {form.niveis.length === 0 && (
            <div style={{ padding:"20px",textAlign:"center",background:"#0d0d14",borderRadius:"10px",border:"1px dashed #2a2a3a",color:"#3e3e55",fontSize:"12px" }}>
              Clique em "+ Nível" para definir a hierarquia de aprovação
            </div>
          )}
          <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
            {form.niveis.map((n, idx) => (
              <div key={n.id} style={{ background:"#0d0d14",borderRadius:"10px",border:"1px solid #2a2a3a",padding:"10px 12px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap" }}>
                {/* Ordem */}
                <div style={{ width:"24px",height:"24px",borderRadius:"6px",background:"#6c63ff22",border:"1px solid #6c63ff44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:800,color:"#a78bfa",flexShrink:0 }}>
                  {idx+1}
                </div>
                {/* Cargo */}
                <select value={n.cargo} onChange={e=>setNivel(idx,"cargo",e.target.value)} style={{...inp,flex:1,minWidth:"160px"}}>
                  {Object.entries(ROLES_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
                {/* Label personalizado */}
                <input value={n.label||""} onChange={e=>setNivel(idx,"label",e.target.value)} placeholder="Descrição (opcional)" style={{...inp,flex:1,minWidth:"140px"}}/>
                {/* Mover + remover */}
                <div style={{ display:"flex",gap:"4px",flexShrink:0 }}>
                  <button onClick={()=>moveNivel(idx,-1)} disabled={idx===0} style={{ width:"26px",height:"26px",borderRadius:"6px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontSize:"12px" }}>↑</button>
                  <button onClick={()=>moveNivel(idx,1)} disabled={idx===form.niveis.length-1} style={{ width:"26px",height:"26px",borderRadius:"6px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontSize:"12px" }}>↓</button>
                  <button onClick={()=>removeNivel(idx)} style={{ width:"26px",height:"26px",borderRadius:"6px",border:"1px solid #f04f5e44",background:"transparent",color:"#f04f5e",cursor:"pointer",fontSize:"12px" }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"flex",gap:"10px",justifyContent:"flex-end" }}>
          <button onClick={onCancelar} style={{ padding:"9px 18px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontWeight:600,fontSize:"13px",fontFamily:"inherit" }}>Cancelar</button>
          <button onClick={()=>onSalvar(form)} disabled={!form.nome.trim()||form.niveis.length===0}
            style={{ padding:"9px 24px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"13px",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44",opacity:!form.nome.trim()||form.niveis.length===0?0.5:1 }}>
            💾 Salvar alçada
          </button>
        </div>
      </div>
    );
  };

  // ── Filtros para o Kanban ──
  const solFiltradas = solicitacoes.filter(s => {
    if (filtroTipo   && s.tipo   !== filtroTipo)   return false;
    if (filtroStatus && s.status !== filtroStatus) return false;
    return true;
  });

  // Colunas do Kanban
  const KANBAN_COLS = [
    { id:"em_aprovacao", label:"⏳ Em aprovação", color:"#6c63ff" },
    { id:"aprovado",     label:"✅ Aprovado",     color:"#22d3a0" },
    { id:"rejeitado",    label:"❌ Rejeitado",    color:"#f04f5e" },
  ];

  if (loading) return (
    <div style={{ textAlign:"center",padding:"60px" }}>
      <div style={{ width:"28px",height:"28px",border:"3px solid #1f1f2e",borderTop:"3px solid #6c63ff",borderRadius:"50%",animation:"spin .7s linear infinite",margin:"0 auto 12px" }}/>
    </div>
  );

  return (
    <div>
      {/* Header + abas */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"24px",flexWrap:"wrap",gap:"12px" }}>
        <div>
          <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:900,color:"#f0f0fa",margin:"0 0 4px",letterSpacing:"-0.3px" }}>🔀 Alçadas de Aprovação</h2>
          <p style={{ fontSize:"12px",color:"#3e3e55",margin:0 }}>{alcadas.filter(a=>a.ativa).length} alçada{alcadas.filter(a=>a.ativa).length!==1?"s":""} ativa{alcadas.filter(a=>a.ativa).length!==1?"s":""} · {solicitacoes.length} solicitaç{solicitacoes.length!==1?"ões":"ão"}</p>
        </div>
        <div style={{ display:"flex",gap:"6px" }}>
          {[{id:"kanban",label:"📊 Kanban"},{id:"cadastro",label:"⚙️ Cadastro"}].map(t=>(
            <button key={t.id} onClick={()=>setAba(t.id)}
              style={{ padding:"7px 16px",borderRadius:"9px",border:"1px solid "+(aba===t.id?"#6c63ff":"#2a2a3a"),background:aba===t.id?"#6c63ff22":"transparent",color:aba===t.id?"#a78bfa":"#6e6e88",fontSize:"12px",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ABA: CADASTRO ── */}
      {aba==="cadastro" && (
        <div>
          <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:"16px" }}>
            {canManage && (
              <button onClick={()=>{setEditAlcada(null);setShowFormAlc(true);}}
                style={{ padding:"8px 18px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",fontWeight:700,fontSize:"12px",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44" }}>
                + Nova Alçada
              </button>
            )}
          </div>

          {showFormAlc && (
            <FormAlcada
              inicial={editAlcada}
              onSalvar={async (dados) => {
                const nova = editAlcada
                  ? alcadas.map(a=>a.id===editAlcada.id?dados:a)
                  : [...alcadas, dados];
                await salvarAlcadas(nova);
                setShowFormAlc(false); setEditAlcada(null);
              }}
              onCancelar={()=>{setShowFormAlc(false);setEditAlcada(null);}}
            />
          )}

          {alcadas.length===0 && !showFormAlc && (
            <div style={{ textAlign:"center",padding:"60px",background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e" }}>
              <div style={{ fontSize:"40px",marginBottom:"12px" }}>🔀</div>
              <div style={{ fontSize:"14px",color:"#3e3e55",marginBottom:"16px" }}>Nenhuma alçada cadastrada</div>
              {canManage && <button onClick={()=>setShowFormAlc(true)} style={{ padding:"9px 20px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontFamily:"inherit" }}>Criar primeira alçada</button>}
            </div>
          )}

          <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
            {alcadas.map(alc=>{
              const tipo = TIPOS_SOLICITACAO.find(t=>t.id===alc.tipo);
              return (
                <div key={alc.id} style={{ background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e",padding:"16px 20px" }}>
                  <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"12px",flexWrap:"wrap" }}>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px" }}>
                        <span style={{ fontSize:"18px" }}>{tipo?.icon||"📋"}</span>
                        <span style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa" }}>{alc.nome}</span>
                        <span style={{ padding:"2px 10px",borderRadius:"99px",fontSize:"10px",fontWeight:700,background:alc.ativa?"#22d3a018":"#2a2a3a",color:alc.ativa?"#22d3a0":"#6e6e88",border:"1px solid "+(alc.ativa?"#22d3a033":"#2a2a3a") }}>
                          {alc.ativa?"● Ativa":"○ Inativa"}
                        </span>
                      </div>
                      <div style={{ fontSize:"11px",color:"#6e6e88",marginBottom:"10px" }}>{tipo?.label} · {alc.niveis?.length||0} nível{(alc.niveis?.length||0)!==1?"is":""} de aprovação</div>
                      {/* Fluxo visual */}
                      <div style={{ display:"flex",alignItems:"center",gap:"4px",flexWrap:"wrap" }}>
                        {(alc.niveis||[]).map((n,i)=>{
                          const badge = ROLE_BADGES[n.cargo];
                          return (
                            <React.Fragment key={n.id}>
                              <div style={{ padding:"4px 10px",borderRadius:"8px",background:badge?.bg||"#2a2a3a",border:"1px solid "+(badge?.color||"#6e6e88")+"44",fontSize:"11px",fontWeight:700,color:badge?.color||"#6e6e88" }}>
                                {i+1}. {n.label||ROLES_LABELS[n.cargo]||n.cargo}
                              </div>
                              {i<alc.niveis.length-1 && <span style={{ color:"#3e3e55",fontSize:"14px" }}>→</span>}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                    {canManage && (
                      <div style={{ display:"flex",gap:"6px",flexShrink:0 }}>
                        <button onClick={()=>{setEditAlcada(alc);setShowFormAlc(true);}}
                          style={{ padding:"6px 12px",borderRadius:"8px",border:"1px solid #6c63ff44",background:"#6c63ff18",color:"#a78bfa",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"inherit" }}>✏️</button>
                        <button onClick={async()=>{ if(window.confirm("Excluir esta alçada?")) await salvarAlcadas(alcadas.filter(a=>a.id!==alc.id)); }}
                          style={{ padding:"6px 12px",borderRadius:"8px",border:"1px solid #f04f5e44",background:"#f04f5e18",color:"#f04f5e",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"inherit" }}>🗑</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ABA: KANBAN ── */}
      {aba==="kanban" && (
        <div>
          {/* Filtros */}
          <div style={{ display:"flex",gap:"8px",marginBottom:"20px",flexWrap:"wrap",alignItems:"center" }}>
            <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)} style={{...inp,width:"auto",minWidth:"180px"}}>
              <option value="">Todos os tipos</option>
              {TIPOS_SOLICITACAO.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
            <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{...inp,width:"auto",minWidth:"160px"}}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_SOL).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            {(filtroTipo||filtroStatus) && (
              <button onClick={()=>{setFiltroTipo("");setFiltroStatus("");}}
                style={{ padding:"7px 12px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontSize:"11px",fontFamily:"inherit" }}>✕ Limpar</button>
            )}
            <span style={{ fontSize:"11px",color:"#3e3e55",marginLeft:"auto" }}>{solFiltradas.length} solicitaç{solFiltradas.length!==1?"ões":"ão"}</span>
          </div>

          {solicitacoes.length===0 && (
            <div style={{ textAlign:"center",padding:"60px",background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e" }}>
              <div style={{ fontSize:"40px",marginBottom:"12px" }}>📊</div>
              <div style={{ fontSize:"14px",color:"#3e3e55" }}>Nenhuma solicitação em andamento</div>
              <div style={{ fontSize:"12px",color:"#3e3e55",marginTop:"6px" }}>As solicitações de viagem e OS aparecerão aqui quando submetidas para aprovação</div>
            </div>
          )}

          {/* Colunas Kanban */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"14px",overflowX:"auto",minWidth:"700px" }}>
            {KANBAN_COLS.map(col => {
              const cards = solFiltradas.filter(s=>s.status===col.id);
              return (
                <div key={col.id} style={{ background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e",minHeight:"200px" }}>
                  {/* Header coluna */}
                  <div style={{ padding:"12px 16px",borderBottom:"1px solid #1f1f2e",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <span style={{ fontSize:"13px",fontWeight:700,color:col.color }}>{col.label}</span>
                    <span style={{ fontSize:"11px",background:col.color+"22",color:col.color,padding:"1px 8px",borderRadius:"99px",fontWeight:700 }}>{cards.length}</span>
                  </div>

                  {/* Cards */}
                  <div style={{ padding:"10px",display:"flex",flexDirection:"column",gap:"8px" }}>
                    {cards.map(sol => {
                      const tipo = TIPOS_SOLICITACAO.find(t=>t.id===sol.tipo);
                      const nivelAtual = sol.niveis?.[sol.nivelAtual];
                      const nivelBadge = ROLE_BADGES[nivelAtual?.cargo];
                      const podeAct = podeAgir(sol);
                      const isSel = acaoSel?.solId === sol.id;

                      return (
                        <div key={sol.id} style={{ background:"#18181f",borderRadius:"10px",border:"1px solid "+(podeAct?"#6c63ff44":"#2a2a3a"),padding:"12px 14px",transition:"border-color .2s" }}>
                          {/* Tipo + ID */}
                          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"6px" }}>
                            <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
                              <span style={{ fontSize:"14px" }}>{tipo?.icon||"📋"}</span>
                              <span style={{ fontSize:"11px",fontWeight:700,color:"#a78bfa" }}>#{sol.id.slice(-4).toUpperCase()}</span>
                            </div>
                            <span style={{ fontSize:"10px",color:"#3e3e55" }}>
                              {new Date(sol.criadoEm).toLocaleDateString("pt-BR")}
                            </span>
                          </div>

                          {/* Dados principais */}
                          <div style={{ fontSize:"12px",fontWeight:600,color:"#f0f0fa",marginBottom:"4px" }}>
                            {sol.dados?.cliente||sol.dados?.titulo||tipo?.label}
                          </div>
                          <div style={{ fontSize:"11px",color:"#6e6e88",marginBottom:"8px" }}>
                            👤 {sol.criadoPor}
                            {sol.dados?.motivo && <span> · {sol.dados.motivo}</span>}
                          </div>

                          {/* Nível atual */}
                          {sol.status==="em_aprovacao" && nivelAtual && (
                            <div style={{ marginBottom:"8px" }}>
                              <div style={{ fontSize:"9px",color:"#3e3e55",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"4px" }}>Aguardando aprovação de:</div>
                              {/* Fluxo de níveis */}
                              <div style={{ display:"flex",alignItems:"center",gap:"3px",flexWrap:"wrap",marginBottom:"6px" }}>
                                {sol.niveis.map((n,i)=>{
                                  const badge = ROLE_BADGES[n.cargo];
                                  const passou = i < sol.nivelAtual;
                                  const atual  = i === sol.nivelAtual;
                                  return (
                                    <React.Fragment key={n.id||i}>
                                      <div style={{ padding:"2px 7px",borderRadius:"6px",fontSize:"9px",fontWeight:700,
                                        background:passou?"#22d3a018":atual?badge?.bg||"#6c63ff18":"transparent",
                                        color:passou?"#22d3a0":atual?badge?.color||"#a78bfa":"#3e3e55",
                                        border:"1px solid "+(passou?"#22d3a033":atual?(badge?.color||"#6c63ff")+"44":"#2a2a3a") }}>
                                        {passou?"✓ ":atual?"● ":""}{n.label||ROLES_LABELS[n.cargo]||n.cargo}
                                      </div>
                                      {i<sol.niveis.length-1 && <span style={{ color:"#2a2a3a",fontSize:"10px" }}>›</span>}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Histórico resumido */}
                          {sol.historico?.length > 1 && (
                            <div style={{ fontSize:"10px",color:"#3e3e55",marginBottom:"8px",borderTop:"1px solid #1f1f2e",paddingTop:"6px" }}>
                              {sol.historico.slice(-2).map((h,i)=>(
                                <div key={i} style={{ marginBottom:"2px" }}>
                                  <span style={{ color:h.acao==="aprovado"?"#22d3a0":h.acao==="rejeitado"?"#f04f5e":"#6e6e88" }}>
                                    {h.acao==="aprovado"?"✓":h.acao==="rejeitado"?"✕":h.acao==="devolvido"?"↩":"·"} 
                                  </span>
                                  {" "}{h.nivel||""} {h.por&&`(${h.por.split(" ")[0]})`}
                                  {h.obs && <span style={{ color:"#6e6e88" }}> — {h.obs.slice(0,40)}{h.obs.length>40?"...":""}</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Botões de ação */}
                          {podeAct && (
                            <div style={{ display:"flex",gap:"5px",flexWrap:"wrap" }}>
                              {[
                                {a:"aprovado",  l:"✅ Aprovar",  c:"#22d3a0"},
                                {a:"rejeitado", l:"❌ Rejeitar", c:"#f04f5e"},
                                {a:"devolvido", l:"↩ Devolver",  c:"#f5a623"},
                              ].map(btn=>(
                                <button key={btn.a}
                                  onClick={()=>setAcaoSel(isSel&&acaoSel.acao===btn.a?null:{solId:sol.id,acao:btn.a})}
                                  style={{ padding:"4px 10px",borderRadius:"7px",border:"1px solid "+btn.c+"44",background:isSel&&acaoSel.acao===btn.a?btn.c+"22":"transparent",color:btn.c,fontSize:"10px",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
                                  {btn.l}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Painel de confirmação */}
                          {isSel && (
                            <div style={{ marginTop:"8px",background:"#0d0d14",borderRadius:"8px",padding:"10px",border:"1px solid #2a2a3a" }}>
                              <textarea value={comentario} onChange={e=>setComentario(e.target.value)} rows={2}
                                placeholder={acaoSel.acao==="aprovado"?"Observação (opcional)...":"Motivo (recomendado)..."}
                                style={{ width:"100%",padding:"7px 10px",borderRadius:"7px",border:"1px solid #2a2a3a",background:"#111118",color:"#c8c8d8",fontSize:"11px",fontFamily:"inherit",resize:"none",outline:"none",boxSizing:"border-box",marginBottom:"7px",lineHeight:1.5 }}/>
                              <div style={{ display:"flex",gap:"6px",justifyContent:"flex-end" }}>
                                <button onClick={()=>{setAcaoSel(null);setComentario("");}} style={{ padding:"4px 10px",borderRadius:"6px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontSize:"10px",fontFamily:"inherit" }}>Cancelar</button>
                                <button onClick={()=>processarAcao(sol.id,acaoSel.acao,comentario)}
                                  style={{ padding:"4px 12px",borderRadius:"6px",border:"none",
                                    background:acaoSel.acao==="aprovado"?"#22d3a0":acaoSel.acao==="rejeitado"?"#f04f5e":"#f5a623",
                                    color:"#fff",cursor:"pointer",fontSize:"10px",fontWeight:700,fontFamily:"inherit" }}>
                                  Confirmar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {cards.length===0 && (
                      <div style={{ textAlign:"center",padding:"24px",color:"#3e3e55",fontSize:"11px" }}>Nenhuma solicitação</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO: PAINEL DE ORDENS DE SERVIÇO (editor / admin)
// ─────────────────────────────────────────────────────────────────────────────
function ModuloOrdemServico({ consultores, clientList, scheduleData, setScheduleData, emailConfig, currentUser, theme: T }) {
  const [loading,      setLoading]      = useState(true);
  const [allOS,        setAllOS]        = useState([]);   // todas as OS extraídas das agendas
  const [refreshTick,  setRefreshTick]  = useState(0);   // incrementar para forçar recarregamento
  const [filtroCliente,setFiltroCliente]= useState("");
  const [filtroConsult,setFiltroConsult]= useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroProjeto,setFiltroProjeto]= useState("");
  const [filtroDataDe, setFiltroDataDe] = useState("");
  const [filtroDataAte,setFiltroDataAte]= useState("");
  const [busca,        setBusca]        = useState("");
  const [osSelecionada,setOsSelecionada]= useState(null);  // OS em detalhe/ação
  const [acao,         setAcao]         = useState(null);  // "aprovar"|"rejeitar"|"contestar"
  const [comentario,   setComentario]   = useState("");
  const [salvando,     setSalvando]     = useState(false);
  const [enviandoEmail,setEnviandoEmail]= useState(false);
  const [emailStatus,  setEmailStatus]  = useState(null);

  const OS_STATUS = {
    em_andamento: { label:"Em andamento", color:"#6c63ff", bg:"#6c63ff18", icon:"⚙️" },
    concluida:    { label:"Concluída",    color:"#22d3a0", bg:"#22d3a018", icon:"✅" },
    pendente:     { label:"Pendente",     color:"#f5a623", bg:"#f5a62318", icon:"⏳" },
    cancelada:    { label:"Cancelada",    color:"#f04f5e", bg:"#f04f5e18", icon:"❌" },
    aprovada:     { label:"Aprovada",     color:"#22d3a0", bg:"#22d3a018", icon:"👍" },
    rejeitada:    { label:"Rejeitada",    color:"#f04f5e", bg:"#f04f5e18", icon:"👎" },
    contestada:   { label:"Contestada",   color:"#f5a623", bg:"#f5a62318", icon:"⚠️" },
  };

  // Carregar OS diretamente do Firestore — garante dados atualizados de todas as sessões
  useEffect(() => {
    const carregarOS = async () => {
      setLoading(true);
      const lista = [];
      try {
        await Promise.all(consultores.map(async (consultor) => {
          try {
            const snap = await getDoc(doc(db, "app_data", "schedule_" + consultor));
            const entries = snap.exists() ? (snap.data().value || []) : (scheduleData[consultor] || []);
            for (const e of entries) {
              if (e.osNumero) lista.push({ ...e, consultor });
            }
          } catch(e) {
            for (const e of (scheduleData[consultor] || [])) {
              if (e.osNumero) lista.push({ ...e, consultor });
            }
          }
        }));
      } catch(e) {
        for (const [consultor, entries] of Object.entries(scheduleData||{})) {
          for (const e of (entries||[])) {
            if (e.osNumero) lista.push({ ...e, consultor });
          }
        }
      }
      lista.sort((a,b) => {
        const na = parseInt(a.osNumero?.replace(/\D/g,""))||0;
        const nb = parseInt(b.osNumero?.replace(/\D/g,""))||0;
        return nb - na;
      });
      setAllOS(lista);
      setLoading(false);
    };
    carregarOS();
  }, [consultores, refreshTick]);

  // Sincronizar allOS quando scheduleData mudar (ex: após consultor salvar OS na mesma sessão)
  useEffect(() => {
    const lista = [];
    for (const [consultor, entries] of Object.entries(scheduleData||{})) {
      for (const e of (entries||[])) {
        if (e.osNumero) lista.push({ ...e, consultor });
      }
    }
    if (lista.length === 0) return; // evitar apagar dados já carregados do Firestore
    lista.sort((a,b) => {
      const na = parseInt(a.osNumero?.replace(/\D/g,""))||0;
      const nb = parseInt(b.osNumero?.replace(/\D/g,""))||0;
      return nb - na;
    });
    setAllOS(lista);
  }, [scheduleData]);

  // Salvar alteração de status no scheduleData via Firestore
  const salvarStatus = async (os, novoStatus, obs) => {
    setSalvando(true);
    try {
      const snap = await getDoc(doc(db, "app_data", "schedule_"+os.consultor));
      const lista = snap.exists() ? (snap.data().value||[]) : (scheduleData[os.consultor]||[]);
      const dadosAtualizados = { osStatus:novoStatus, osComentarioGestor:obs, osAvaliadoPor:currentUser.nome||currentUser.username, osAvaliadoRole:currentUser.role||"", osAvaliadoEm:new Date().toISOString() };
      const nova = lista.map(e => e.id===os.id ? { ...e, ...dadosAtualizados } : e);
      await setDoc(doc(db, "app_data", "schedule_"+os.consultor), { value: nova });
      // Atualizar lista local do módulo OS
      setAllOS(prev => prev.map(o => o.id===os.id&&o.consultor===os.consultor ? { ...o, ...dadosAtualizados } : o));
      // Atualizar estado global React para que PainelOSConsultor reflita imediatamente
      if (setScheduleData) {
        setScheduleData(prev => ({
          ...prev,
          [os.consultor]: (prev[os.consultor]||[]).map(e => e.id===os.id ? { ...e, ...dadosAtualizados } : e)
        }));
      }
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const handleAcao = async () => {
    if (!osSelecionada || !acao) return;
    const novoStatus = acao==="aprovar"?"aprovada":acao==="rejeitar"?"rejeitada":"contestada";
    await salvarStatus(osSelecionada, novoStatus, comentario);
    // Enviar e-mail de notificação se configurado
    if (emailConfig?.enabled && osSelecionada.osEmailDest) {
      await enviarEmailNotificacao(osSelecionada, novoStatus, comentario);
    }
    setOsSelecionada(null); setAcao(null); setComentario("");
  };

  const enviarEmailNotificacao = async (os, status, obs) => {
    setEnviandoEmail(true);
    const cfg = emailConfig;
    if (!cfg?.enabled || !cfg.publicKey || !cfg.serviceId || !cfg.templateId) { setEnviandoEmail(false); return; }
    try {
      const loadEJ = () => new Promise((res, rej) => {
        if (window.emailjs) { window.emailjs.init({ publicKey: cfg.publicKey }); res(window.emailjs); return; }
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
        s.onload = () => { window.emailjs.init({ publicKey: cfg.publicKey }); res(window.emailjs); };
        s.onerror = rej; document.head.appendChild(s);
      });
      const ej = await loadEJ();
      const st = OS_STATUS[status]||OS_STATUS.em_andamento;
      const corpo = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
          <div style="background:linear-gradient(135deg,${st.color},${st.color}99);padding:20px 24px">
            <h2 style="color:#fff;margin:0;font-size:18px">${st.icon} OS ${os.osNumero} — ${st.label}</h2>
            <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px">Avaliada por ${currentUser.nome||currentUser.username}</p>
          </div>
          <div style="padding:20px 24px;background:#fff">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              ${[["Consultor",os.consultor],["Cliente",os.client||"—"],["Data",`Dia ${os.day} · ${os.month} ${os.year||""}`],["Status",st.label]].map(([k,v])=>`
                <tr style="border-bottom:1px solid #f0f0f0"><td style="padding:8px 0;color:#666;width:130px;font-weight:600">${k}</td><td style="padding:8px 0;color:#333">${v}</td></tr>
              `).join("")}
            </table>
            ${obs?`<div style="margin-top:16px;padding:14px;background:#fffbf0;border-radius:6px;border-left:3px solid ${st.color}">
              <div style="font-size:12px;font-weight:700;color:${st.color};text-transform:uppercase;margin-bottom:6px">Comentário do gestor</div>
              <div style="font-size:14px;color:#444;line-height:1.6">${obs}</div>
            </div>`:""}
          </div>
        </div>`;
      const dests = os.osEmailDest.split(/[,;]/).map(e=>e.trim()).filter(Boolean);
      for (const dest of dests) {
        await ej.send(cfg.serviceId, cfg.templateId, {
          to_email: dest, to_name: dest,
          subject: `OS ${os.osNumero} ${st.label} — ${os.client||""}`,
          assunto: `OS ${os.osNumero} ${st.label} — ${os.client||""}`,
          corpo, message: `OS ${os.osNumero} foi ${st.label.toLowerCase()} por ${currentUser.nome||currentUser.username}.${obs?" Comentário: "+obs:""}`,
          from_name: cfg.fromName || `GSC - ${currentUser.nome||currentUser.username}`,
        });
      }
      setEmailStatus("ok");
    } catch(e) { console.error(e); setEmailStatus("erro"); }
    setEnviandoEmail(false);
  };

  // Filtros aplicados
  const osFiltradas = allOS.filter(os => {
    if (filtroCliente && os.client !== filtroCliente) return false;
    if (filtroConsult && os.consultor !== filtroConsult) return false;
    if (filtroStatus  && os.osStatus  !== filtroStatus)  return false;
    if (filtroProjeto && !(os.osDescricao||"").toLowerCase().includes(filtroProjeto.toLowerCase()) && !(os.osSistema||"").toLowerCase().includes(filtroProjeto.toLowerCase())) return false;
    // Filtro de data: usa osPreenchidaEm ou day+month como referência
    if (filtroDataDe || filtroDataAte) {
      const osDate = os.osPreenchidaEm ? os.osPreenchidaEm.slice(0,10) : null;
      if (!osDate) return !filtroDataDe && !filtroDataAte;
      if (filtroDataDe && osDate < filtroDataDe) return false;
      if (filtroDataAte && osDate > filtroDataAte) return false;
    }
    if (busca.trim()) {
      const q = busca.toLowerCase();
      return (os.osNumero||"").toLowerCase().includes(q)
          || (os.client||"").toLowerCase().includes(q)
          || (os.consultor||"").toLowerCase().includes(q)
          || (os.osDescricao||"").toLowerCase().includes(q)
          || (os.osSistema||"").toLowerCase().includes(q);
    }
    return true;
  });

  // Total de horas das OS filtradas
  const totalHorasOS = osFiltradas.reduce((acc, os) => {
    if (!os.horaInicio || !os.horaFim || os.horaInicio >= os.horaFim) return acc;
    const [hi,mi] = os.horaInicio.split(":").map(Number);
    const [hf,mf] = os.horaFim.split(":").map(Number);
    const mins = (hf*60+mf) - (hi*60+mi) - (Number(os.intervalo)||0);
    return acc + Math.max(0, mins);
  }, 0);
  const totalHorasStr = totalHorasOS > 0 ? `${Math.floor(totalHorasOS/60)}h${totalHorasOS%60>0?" "+totalHorasOS%60+"min":""}` : null;

  const clientesUnicos  = [...new Set(allOS.map(o=>o.client).filter(Boolean))].sort();
  const consultoresUnicos = [...new Set(allOS.map(o=>o.consultor).filter(Boolean))].sort();
  const projetosUnicos = [...new Set(allOS.map(o=>o.osSistema).filter(Boolean))].sort();

  const inp = { padding:"8px 13px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"12px",fontFamily:"inherit",outline:"none" };

  if (loading) return (
    <div style={{ textAlign:"center",padding:"60px",color:"#3e3e55" }}>
      <div style={{ width:"28px",height:"28px",border:"3px solid #1f1f2e",borderTop:"3px solid #6c63ff",borderRadius:"50%",animation:"spin .7s linear infinite",margin:"0 auto 12px" }}/>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"24px",flexWrap:"wrap",gap:"12px" }}>
        <div>
          <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:900,color:"#f0f0fa",margin:"0 0 4px",letterSpacing:"-0.3px" }}>📋 Ordens de Serviço</h2>
          <p style={{ fontSize:"12px",color:"#3e3e55",margin:0,display:"flex",alignItems:"center",gap:"10px" }}>
            {loading ? "Carregando..." : `${allOS.length} OS registradas · ${osFiltradas.length} exibidas`}
            {totalHorasStr && <span style={{ color:"#22d3a0",fontWeight:700 }}>⏱ {totalHorasStr} no período</span>}
          </p>
        </div>
        <div style={{ display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center" }}>
          <button onClick={()=>{ setLoading(true); setAllOS([]); setRefreshTick(t=>t+1); }}
            style={{ padding:"7px 14px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#111118",color:loading?"#3e3e55":"#6e6e88",cursor:loading?"wait":"pointer",fontSize:"12px",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"6px" }}>
            <span style={{ display:"inline-block",animation:loading?"spin .7s linear infinite":"none" }}>🔄</span>
            {loading?"Atualizando...":"Atualizar"}
          </button>
          {Object.entries(OS_STATUS).map(([k,v])=>{
            const n = allOS.filter(o=>o.osStatus===k).length;
            if (!n) return null;
            return (
              <button key={k} onClick={()=>setFiltroStatus(filtroStatus===k?"":k)}
                style={{ padding:"5px 12px",borderRadius:"99px",border:"1px solid "+(filtroStatus===k?v.color:"#2a2a3a"),background:filtroStatus===k?v.bg:"transparent",color:filtroStatus===k?v.color:"#6e6e88",fontSize:"11px",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
                {v.icon} {v.label} <span style={{ opacity:0.7 }}>({n})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e",padding:"14px 16px",marginBottom:"16px",display:"flex",gap:"10px",flexWrap:"wrap",alignItems:"center" }}>
        {/* Busca */}
        <div style={{ position:"relative",flex:1,minWidth:"180px" }}>
          <span style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",fontSize:"12px",color:"#3e3e55",pointerEvents:"none" }}>🔍</span>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nº OS, cliente, consultor..."
            style={{...inp,width:"100%",boxSizing:"border-box",paddingLeft:"30px"}}/>
        </div>
        <select value={filtroConsult} onChange={e=>setFiltroConsult(e.target.value)} style={{...inp,minWidth:"160px"}}>
          <option value="">Todos os consultores</option>
          {consultoresUnicos.map(c=><option key={c} value={c}>{c.split(" ")[0]}</option>)}
        </select>
        <select value={filtroCliente} onChange={e=>setFiltroCliente(e.target.value)} style={{...inp,minWidth:"160px"}}>
          <option value="">Todos os clientes</option>
          {clientesUnicos.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{...inp,minWidth:"150px"}}>
          <option value="">Todos os status</option>
          {Object.entries(OS_STATUS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <select value={filtroProjeto} onChange={e=>setFiltroProjeto(e.target.value)} style={{...inp,minWidth:"140px"}}>
          <option value="">Todos os sistemas</option>
          {projetosUnicos.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
          <span style={{ fontSize:"11px",color:"#6e6e88",whiteSpace:"nowrap" }}>De:</span>
          <input type="date" value={filtroDataDe} onChange={e=>setFiltroDataDe(e.target.value)} style={{...inp,width:"130px"}}/>
          <span style={{ fontSize:"11px",color:"#6e6e88" }}>Até:</span>
          <input type="date" value={filtroDataAte} onChange={e=>setFiltroDataAte(e.target.value)} style={{...inp,width:"130px"}}/>
        </div>
        {(busca||filtroConsult||filtroCliente||filtroStatus||filtroProjeto||filtroDataDe||filtroDataAte) && (
          <button onClick={()=>{setBusca("");setFiltroConsult("");setFiltroCliente("");setFiltroStatus("");setFiltroProjeto("");setFiltroDataDe("");setFiltroDataAte("");}}
            style={{ padding:"7px 12px",borderRadius:"9px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontSize:"11px",fontFamily:"inherit" }}>✕ Limpar</button>
        )}
      </div>

      {/* Lista de OS */}
      {osFiltradas.length===0 && (
        <div style={{ textAlign:"center",padding:"60px",background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e" }}>
          <div style={{ fontSize:"40px",marginBottom:"12px" }}>📋</div>
          <div style={{ fontSize:"14px",color:"#3e3e55" }}>Nenhuma OS encontrada para os filtros selecionados</div>
        </div>
      )}

      <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
        {osFiltradas.map(os=>{
          const st = OS_STATUS[os.osStatus]||OS_STATUS.em_andamento;
          const isSel = osSelecionada?.id===os.id&&osSelecionada?.consultor===os.consultor;
          const dur = (() => {
            if (!os.horaInicio||!os.horaFim||os.horaInicio>=os.horaFim) return null;
            const [hi,mi]=os.horaInicio.split(":").map(Number);
            const [hf,mf]=os.horaFim.split(":").map(Number);
            const t=(hf*60+mf)-(hi*60+mi)-(Number(os.intervalo)||0);
            if(t<=0)return null;
            return `${Math.floor(t/60)}h${t%60>0?" "+t%60+"min":""}`;
          })();
          return (
            <div key={os.id+os.consultor} style={{ background:"#111118",borderRadius:"14px",border:"1px solid "+(isSel?"#6c63ff44":"#1f1f2e"),overflow:"hidden",transition:"border-color .15s" }}>
              {/* Linha principal */}
              <div style={{ padding:"14px 18px",display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap",cursor:"pointer" }}
                onClick={()=>{ setOsSelecionada(isSel?null:os); setAcao(null); setComentario(""); setEmailStatus(null); }}>
                {/* Nº OS */}
                <div style={{ minWidth:"90px" }}>
                  <div style={{ fontSize:"12px",fontWeight:800,color:"#a78bfa" }}>{os.osNumero}</div>
                  <div style={{ fontSize:"10px",color:"#3e3e55",marginTop:"1px" }}>Dia {os.day} {os.month} {os.year||""}</div>
                </div>
                {/* Cliente */}
                <div style={{ flex:1,minWidth:"120px" }}>
                  <div style={{ fontSize:"13px",fontWeight:700,color:"#f0f0fa" }}>{os.client||"—"}</div>
                  <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"1px" }}>
                    {os.osSistema && <span>🖥 {os.osSistema} · </span>}
                    👤 {os.consultor?.split(" ")[0]}
                  </div>
                </div>
                {/* Horário */}
                {(os.horaInicio||os.horaFim) && (
                  <div style={{ fontSize:"11px",color:"#6e6e88",whiteSpace:"nowrap" }}>
                    🕐 {os.horaInicio||"?"}{os.horaFim?" → "+os.horaFim:""}
                    {dur && <span style={{ color:"#22d3a0",marginLeft:"6px" }}>({dur})</span>}
                  </div>
                )}
                {/* Status */}
                <span style={{ padding:"4px 12px",borderRadius:"99px",background:st.bg,border:"1px solid "+st.color+"44",fontSize:"11px",fontWeight:700,color:st.color,whiteSpace:"nowrap" }}>
                  {st.icon} {st.label}
                </span>
                <span style={{ color:"#3e3e55",fontSize:"12px" }}>{isSel?"▴":"▾"}</span>
              </div>

              {/* Painel expandido */}
              {isSel && (
                <div style={{ borderTop:"1px solid #1f1f2e",padding:"16px 18px" }}>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px",marginBottom:"16px" }}>
                    {/* Detalhes */}
                    <div>
                      <div style={{ fontSize:"10px",color:"#3e3e55",fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",marginBottom:"8px" }}>Detalhes</div>
                      <div style={{ display:"flex",flexDirection:"column",gap:"5px",fontSize:"12px" }}>
                        {os.osDescricao && <div><span style={{ color:"#6e6e88" }}>Descrição: </span><span style={{ color:"#c8c8d8" }}>{os.osDescricao}</span></div>}
                        <div><span style={{ color:"#6e6e88" }}>Consultor: </span><span style={{ color:"#c8c8d8" }}>{os.consultor}</span></div>
                        <div><span style={{ color:"#6e6e88" }}>Modalidade: </span><span style={{ color:"#c8c8d8" }}>{os.modalidade==="remoto"?"💻 Remoto":"🏢 Presencial"}</span></div>
                        {os.osEmailDest && <div><span style={{ color:"#6e6e88" }}>E-mail: </span><span style={{ color:"#c8c8d8" }}>{os.osEmailDest}</span></div>}
                        {os.osPreenchidaEm && <div><span style={{ color:"#6e6e88" }}>Preenchida em: </span><span style={{ color:"#3e3e55" }}>{new Date(os.osPreenchidaEm).toLocaleString("pt-BR")}</span></div>}
                        {os.osAvaliadoPor && <div><span style={{ color:"#6e6e88" }}>Avaliada por: </span><span style={{ color:"#c8c8d8" }}>{os.osAvaliadoPor} em {os.osAvaliadoEm?new Date(os.osAvaliadoEm).toLocaleString("pt-BR"):""}</span></div>}
                      </div>
                    </div>
                    {/* Atividades */}
                    <div>
                      <div style={{ fontSize:"10px",color:"#3e3e55",fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",marginBottom:"8px" }}>Atividades realizadas</div>
                      <div style={{ fontSize:"12px",color:"#c8c8d8",lineHeight:1.6,whiteSpace:"pre-wrap",maxHeight:"140px",overflowY:"auto" }}>
                        {os.atividades||<span style={{ color:"#3e3e55" }}>Não preenchido</span>}
                      </div>
                    </div>
                  </div>

                  {/* Comentário anterior do gestor */}
                  {os.osComentarioGestor && (
                    <div style={{ background:st.bg,borderRadius:"10px",border:"1px solid "+st.color+"33",padding:"10px 14px",marginBottom:"14px",fontSize:"12px" }}>
                      <span style={{ color:st.color,fontWeight:700 }}>{st.icon} Comentário do gestor: </span>
                      <span style={{ color:"#c8c8d8" }}>{os.osComentarioGestor}</span>
                    </div>
                  )}

                  {/* Botões de ação */}
                  <div style={{ display:"flex",gap:"8px",flexWrap:"wrap",marginBottom: acao?"14px":"0" }}>
                    {[
                      { id:"aprovar",   label:"👍 Aprovar",    color:"#22d3a0", bg:"#22d3a018", border:"#22d3a044" },
                      { id:"rejeitar",  label:"👎 Rejeitar",   color:"#f04f5e", bg:"#f04f5e18", border:"#f04f5e44" },
                      { id:"contestar", label:"⚠️ Contestar",  color:"#f5a623", bg:"#f5a62318", border:"#f5a62344" },
                    ].map(btn=>(
                      <button key={btn.id} onClick={()=>setAcao(acao===btn.id?null:btn.id)}
                        style={{ padding:"8px 18px",borderRadius:"10px",border:"1px solid "+(acao===btn.id?btn.color:btn.border),background:acao===btn.id?btn.bg:"transparent",color:btn.color,fontSize:"12px",fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s" }}>
                        {btn.label}
                      </button>
                    ))}
                    {/* Enviar e-mail de notificação avulso */}
                    {os.osEmailDest && (
                      <button onClick={async()=>{ setEnviandoEmail(true); await enviarEmailNotificacao(os, os.osStatus||"em_andamento",""); setEnviandoEmail(false); }}
                        disabled={enviandoEmail}
                        style={{ padding:"8px 18px",borderRadius:"10px",border:"1px solid #6c63ff44",background:"#6c63ff18",color:"#a78bfa",fontSize:"12px",fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginLeft:"auto" }}>
                        {enviandoEmail?"⏳":"📧"} Enviar e-mail
                      </button>
                    )}
                  </div>

                  {/* Painel de comentário */}
                  {acao && (
                    <div style={{ background:"#0d0d14",borderRadius:"12px",border:"1px solid #2a2a3a",padding:"14px",marginBottom:"12px" }}>
                      <div style={{ fontSize:"11px",color:"#6e6e88",fontWeight:700,marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.5px" }}>
                        {acao==="aprovar"?"👍 Aprovar OS":acao==="rejeitar"?"👎 Rejeitar OS":"⚠️ Contestar OS"} — Comentário {acao!=="aprovar"?"(obrigatório)":"(opcional)"}
                      </div>
                      <textarea value={comentario} onChange={e=>setComentario(e.target.value)} rows={3}
                        placeholder={acao==="aprovar"?"Observações sobre a aprovação (opcional)...":acao==="rejeitar"?"Descreva o motivo da rejeição...":"Descreva o ponto de contestação..."}
                        style={{ width:"100%",padding:"9px 13px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"#111118",color:"#c8c8d8",fontSize:"12px",fontFamily:"inherit",outline:"none",resize:"vertical",lineHeight:1.5,boxSizing:"border-box" }}/>
                      {(acao==="rejeitar"||acao==="contestar") && !comentario.trim() && (
                        <div style={{ fontSize:"10px",color:"#f5a623",marginTop:"5px" }}>⚠️ Comentário obrigatório para {acao==="rejeitar"?"rejeição":"contestação"}</div>
                      )}
                      <div style={{ display:"flex",gap:"8px",marginTop:"10px",justifyContent:"flex-end" }}>
                        <button onClick={()=>{setAcao(null);setComentario("");}} style={{ padding:"8px 16px",borderRadius:"9px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontWeight:600,fontSize:"12px",fontFamily:"inherit" }}>Cancelar</button>
                        <button onClick={handleAcao}
                          disabled={salvando||((acao==="rejeitar"||acao==="contestar")&&!comentario.trim())}
                          style={{ padding:"8px 20px",borderRadius:"9px",border:"none",
                            background:acao==="aprovar"?"linear-gradient(135deg,#22d3a0,#10b981)":acao==="rejeitar"?"linear-gradient(135deg,#f04f5e,#e11d48)":"linear-gradient(135deg,#f5a623,#d97706)",
                            color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"12px",fontFamily:"inherit",opacity:salvando?0.6:1 }}>
                          {salvando?"⏳ Salvando...":`Confirmar ${acao==="aprovar"?"aprovação":acao==="rejeitar"?"rejeição":"contestação"}`}
                        </button>
                      </div>
                    </div>
                  )}

                  {emailStatus==="ok" && <div style={{ padding:"8px 12px",borderRadius:"8px",background:"#22d3a015",border:"1px solid #22d3a044",fontSize:"11px",color:"#22d3a0",fontWeight:600 }}>✅ E-mail enviado!</div>}
                  {emailStatus==="erro" && <div style={{ padding:"8px 12px",borderRadius:"8px",background:"#f04f5e15",border:"1px solid #f04f5e44",fontSize:"11px",color:"#f04f5e" }}>❌ Falha ao enviar e-mail</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO: VIAGEM E HOSPEDAGEM
// ─────────────────────────────────────────────────────────────────────────────
function ModuloViagens({ currentUser, canEdit, canManage, consultores, clientList, theme: T }) {
  const [viagens,   setViagens]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editando,  setEditando]  = useState(null);

  const isConsultor = currentUser.role === "consultor";
  const nomeLogado  = currentUser.consultorName || currentUser.nome || currentUser.username || "";

  const STATUS_CONFIG = {
    pendente:  { label:"Pendente",   color:"#f5a623", bg:"#f5a62318" },
    aprovada:  { label:"Aprovada",   color:"#22d3a0", bg:"#22d3a018" },
    rejeitada: { label:"Rejeitada",  color:"#f04f5e", bg:"#f04f5e18" },
    realizada: { label:"Realizada",  color:"#6c63ff", bg:"#6c63ff18" },
  };

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "app_data", "viagens_all"));
        if (snap.exists()) setViagens(snap.data().value || []);
      } catch(e) { console.warn(e); }
      setLoading(false);
    };
    load();
  }, []);

  const salvarViagens = async (lista) => {
    setViagens(lista);
    await setDoc(doc(db, "app_data", "viagens_all"), { value: lista });
  };

  const handleStatusChange = async (id, status, comentario="") => {
    const viagem = viagens.find(v=>v.id===id);
    const novas = viagens.map(v=>v.id===id?{...v,status,comentarioGestor:comentario,avaliadoEm:new Date().toISOString()}:v);
    await salvarViagens(novas);
    if (status==="aprovada" && viagem?.consultor) {
      try {
        const key = "notif_viagem_"+viagem.consultor.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
        const snap = await getDoc(doc(db, "app_data", key));
        const atual = snap.exists() ? (snap.data().value||[]) : [];
        const jaExiste = atual.some(n=>n.id===id);
        if (!jaExiste) await setDoc(doc(db, "app_data", key), { value: [...atual, {...viagem,status:"aprovada",id}] });
      } catch(e) { console.warn(e); }
    }
  };

  const viagensFiltradas = isConsultor
    ? viagens.filter(v => v.consultor===nomeLogado || v.solicitante===nomeLogado)
    : viagens;

  const inp = { padding:"9px 13px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"13px",width:"100%",boxSizing:"border-box",fontFamily:"inherit" };
  const lbl = { fontSize:"11px",color:"#6e6e88",fontWeight:700,display:"block",marginBottom:"6px",letterSpacing:"0.5px",textTransform:"uppercase" };

  const FormViagem = ({ inicial, onSalvar, onCancelar }) => {
    const vazio = {
      solicitante:nomeLogado, setor:"Serviços", consultor:isConsultor?nomeLogado:"",
      cliente:"", enderecoCliente:"", motivo:"Atendimento Presencial",
      observacoes:"", destinoCobranca:"TSM",
      cidadeHospedagem:"", checkIn:"", checkOut:"",
      incluirVoo:false, aeroportoOrigem:"", dataVooIda:"", horarioIda:"",
      aeroportoDestino:"", dataVooVolta:"", horarioVolta:"",
      status:"pendente",
    };
    const [form, setForm] = useState(inicial||vazio);
    const set = (k,v) => setForm(p=>({...p,[k]:v}));

    const handleClienteChange = (nome) => {
      set("cliente", nome);
      const cli = (clientList||[]).find(c=>c.name===nome);
      if (cli?.endereco) set("enderecoCliente", cli.endereco);
    };

    const noites = form.checkIn&&form.checkOut ? Math.round((new Date(form.checkOut)-new Date(form.checkIn))/86400000) : 0;

    return (
      <div style={{ background:"#111118",borderRadius:"16px",border:"1px solid #1f1f2e",padding:"24px",maxWidth:"720px",marginBottom:"24px" }}>
        <h3 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"17px",fontWeight:900,color:"#f0f0fa",margin:"0 0 20px",letterSpacing:"-0.3px" }}>
          {inicial?"✏️ Editar Solicitação":"🏨 Nova Solicitação de Viagem e Hospedagem"}
        </h3>

        {/* Solicitação */}
        <div style={{ fontSize:"11px",color:"#6c63ff",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"12px" }}>Solicitação</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"20px" }}>
          <div>
            <label style={lbl}>Solicitante</label>
            <div style={{...inp,background:"#18181f",color:"#6e6e88",cursor:"default",display:"flex",alignItems:"center" }}>{form.solicitante}</div>
          </div>
          <div>
            <label style={lbl}>Setor</label>
            <select value={form.setor} onChange={e=>set("setor",e.target.value)} style={inp}>
              {["Comercial","Serviços","Marketing","Administrativo"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Consultor</label>
            {isConsultor
              ? <div style={{...inp,background:"#18181f",color:"#6e6e88",cursor:"default",display:"flex",alignItems:"center"}}>{nomeLogado}</div>
              : <select value={form.consultor} onChange={e=>set("consultor",e.target.value)} style={inp}>
                  <option value="">Selecione...</option>
                  {consultores.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
            }
          </div>
          <div>
            <label style={lbl}>Cliente</label>
            <select value={form.cliente} onChange={e=>handleClienteChange(e.target.value)} style={inp}>
              <option value="">Selecione...</option>
              {(clientList||[]).map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Endereço do cliente</label>
            <input value={form.enderecoCliente} onChange={e=>set("enderecoCliente",e.target.value)} placeholder="Preenchido automaticamente ou edite manualmente" style={inp}/>
          </div>
          <div>
            <label style={lbl}>Motivo da solicitação</label>
            <select value={form.motivo} onChange={e=>set("motivo",e.target.value)} style={inp}>
              {["Reunião Comercial","Atendimento Presencial","Expediente em outras unidades","Eventos"].map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Destino da cobrança</label>
            <select value={form.destinoCobranca} onChange={e=>set("destinoCobranca",e.target.value)} style={inp}>
              <option value="TSM">TSM</option>
              <option value="Cliente">Cliente</option>
            </select>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Observações</label>
            <textarea value={form.observacoes} onChange={e=>set("observacoes",e.target.value)} rows={2} placeholder="Informações adicionais..." style={{...inp,resize:"vertical",lineHeight:1.5}}/>
          </div>
        </div>

        {/* Hospedagem */}
        <div style={{ fontSize:"11px",color:"#22d3a0",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"12px" }}>🏨 Hospedagem</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px",marginBottom:"20px" }}>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Cidade da hospedagem</label>
            <input value={form.cidadeHospedagem} onChange={e=>set("cidadeHospedagem",e.target.value)} placeholder="Ex: São Paulo, SP (deixe vazio se não precisar de hospedagem)" style={inp}/>
          </div>
          <div>
            <label style={lbl}>Check-in</label>
            <input type="date" value={form.checkIn} onChange={e=>set("checkIn",e.target.value)} style={inp}/>
          </div>
          <div>
            <label style={lbl}>Check-out</label>
            <input type="date" value={form.checkOut} onChange={e=>set("checkOut",e.target.value)} style={inp}/>
          </div>
          <div style={{ display:"flex",alignItems:"center",paddingTop:"22px" }}>
            {noites>0 && <span style={{ fontSize:"12px",color:"#22d3a0",fontWeight:600 }}>🌙 {noites} noite{noites>1?"s":""}</span>}
          </div>
        </div>

        {/* Voo */}
        <div style={{ display:"flex",alignItems:"center",gap:"14px",marginBottom:"12px" }}>
          <div style={{ fontSize:"11px",color:"#a78bfa",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase" }}>✈️ Deseja incluir voo?</div>
          <div style={{ display:"flex",gap:"6px" }}>
            {[{v:false,l:"Não"},{v:true,l:"Sim"}].map(opt=>(
              <button key={String(opt.v)} onClick={()=>set("incluirVoo",opt.v)}
                style={{ padding:"4px 16px",borderRadius:"99px",border:"1px solid "+(form.incluirVoo===opt.v?"#a78bfa":"#2a2a3a"),background:form.incluirVoo===opt.v?"#a78bfa22":"transparent",color:form.incluirVoo===opt.v?"#a78bfa":"#6e6e88",fontSize:"12px",fontWeight:form.incluirVoo===opt.v?700:400,cursor:"pointer",fontFamily:"inherit" }}>{opt.l}</button>
            ))}
          </div>
        </div>
        {form.incluirVoo && (
          <div style={{ background:"#0d0d14",borderRadius:"12px",border:"1px solid #2a2a3a",padding:"14px",marginBottom:"20px" }}>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
              <div>
                <label style={lbl}>Aeroporto de origem</label>
                <input value={form.aeroportoOrigem} onChange={e=>set("aeroportoOrigem",e.target.value)} placeholder="Ex: GRU — Guarulhos" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Aeroporto de destino</label>
                <input value={form.aeroportoDestino} onChange={e=>set("aeroportoDestino",e.target.value)} placeholder="Ex: CGH — Congonhas" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Data de ida</label>
                <input type="date" value={form.dataVooIda} onChange={e=>set("dataVooIda",e.target.value)} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Preferência de horário — ida</label>
                <input value={form.horarioIda} onChange={e=>set("horarioIda",e.target.value)} placeholder="Ex: Manhã / 07:00" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Data de volta</label>
                <input type="date" value={form.dataVooVolta} onChange={e=>set("dataVooVolta",e.target.value)} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Preferência de horário — volta</label>
                <input value={form.horarioVolta} onChange={e=>set("horarioVolta",e.target.value)} placeholder="Ex: Tarde / 18:00" style={inp}/>
              </div>
            </div>
          </div>
        )}

        {canManage && (
          <div style={{ marginBottom:"16px" }}>
            <label style={lbl}>Status</label>
            <select value={form.status} onChange={e=>set("status",e.target.value)} style={{...inp,maxWidth:"200px"}}>
              {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        )}

        <div style={{ display:"flex",gap:"10px",justifyContent:"flex-end" }}>
          <button onClick={onCancelar} style={{ padding:"9px 18px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontWeight:600,fontSize:"13px",fontFamily:"inherit" }}>Cancelar</button>
          <button onClick={()=>onSalvar(form)} style={{ padding:"9px 24px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"13px",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44" }}>
            {inicial?"💾 Salvar alterações":"✅ Enviar solicitação"}
          </button>
        </div>
      </div>
    );
  };

  // Painel de viagens aprovadas — visível ao consultor
  if (loading) return <div style={{ textAlign:"center",padding:"60px" }}><div style={{ width:"28px",height:"28px",border:"3px solid #1f1f2e",borderTop:"3px solid #6c63ff",borderRadius:"50%",animation:"spin .7s linear infinite",margin:"0 auto" }}/></div>;

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"24px",flexWrap:"wrap",gap:"12px" }}>
        <div>
          <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:900,color:"#f0f0fa",margin:"0 0 4px",letterSpacing:"-0.3px" }}>🏨 Viagem e Hospedagem</h2>
          <p style={{ fontSize:"12px",color:"#3e3e55",margin:0 }}>{viagensFiltradas.length} solicitação{viagensFiltradas.length!==1?"ões":""}</p>
        </div>
        <div style={{ display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap" }}>
          {Object.entries(STATUS_CONFIG).map(([k,v])=>{ const qtd=viagensFiltradas.filter(vi=>vi.status===k).length; if(!qtd)return null; return <div key={k} style={{ padding:"4px 10px",borderRadius:"99px",background:v.bg,border:"1px solid "+v.color+"44",fontSize:"11px",fontWeight:700,color:v.color }}>{qtd} {v.label}</div>; })}
          <button onClick={()=>{setEditando(null);setShowForm(true);}} style={{ padding:"8px 18px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",fontWeight:700,fontSize:"12px",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44" }}>
            + Nova Solicitação
          </button>
        </div>
      </div>

      {showForm && (
        <FormViagem inicial={editando}
          onSalvar={async (dados)=>{
            const id = editando ? editando.id : Date.now().toString(36);
            const nova = editando
              ? viagens.map(v=>v.id===editando.id?{...dados,id,atualizadoEm:new Date().toISOString()}:v)
              : [...viagens,{...dados,id,criadoEm:new Date().toISOString()}];
            await salvarViagens(nova);
            // Inserir no fluxo de alçadas se nova viagem
            if (!editando) {
              try {
                const snapAlc = await getDoc(doc(db,"app_data","alcadas_config"));
                const alcs = snapAlc.exists()?(snapAlc.data().value||[]):[];
                const alc = alcs.find(a=>a.tipo==="viagem"&&a.ativa);
                if (alc) {
                  const snapSol = await getDoc(doc(db,"app_data","alcadas_solicitacoes"));
                  const sols = snapSol.exists()?(snapSol.data().value||[]):[];
                  const sol = {
                    id:"v_"+id, tipo:"viagem",
                    dados:{ cliente:dados.cliente, motivo:dados.motivo, consultor:dados.consultor, checkIn:dados.checkIn, checkOut:dados.checkOut },
                    alcadaId:alc.id, niveis:alc.niveis, nivelAtual:0, status:"em_aprovacao", viagemId:id,
                    historico:[{ acao:"criado", por:nomeLogado, role:currentUser.role, em:new Date().toISOString() }],
                    criadoPor:nomeLogado, criadoEm:new Date().toISOString(),
                  };
                  await setDoc(doc(db,"app_data","alcadas_solicitacoes"),{ value:[...sols,sol] });
                }
              } catch(e){ console.warn("Alçada:",e); }
            }
            setShowForm(false); setEditando(null);
          }}
          onCancelar={()=>{setShowForm(false);setEditando(null);}}
        />
      )}

      {viagensFiltradas.length===0 && !showForm && (
        <div style={{ textAlign:"center",padding:"60px",background:"#111118",borderRadius:"16px",border:"1px solid #1f1f2e" }}>
          <div style={{ fontSize:"48px",marginBottom:"14px" }}>🏨</div>
          <div style={{ fontSize:"14px",color:"#3e3e55",marginBottom:"16px" }}>Nenhuma solicitação encontrada</div>
          <button onClick={()=>setShowForm(true)} style={{ padding:"9px 22px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"13px",fontFamily:"inherit" }}>Criar primeira solicitação</button>
        </div>
      )}

      <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
        {viagensFiltradas.sort((a,b)=>new Date(b.criadoEm||0)-new Date(a.criadoEm||0)).map(viagem=>(
          <ViagemCard key={viagem.id} viagem={viagem} STATUS_CONFIG={STATUS_CONFIG} canManage={canManage}
            onEdit={(v)=>{setEditando(v);setShowForm(true);}}
            onStatusChange={handleStatusChange}
            onDelete={async (id)=>{ if(window.confirm("Excluir?")) await salvarViagens(viagens.filter(x=>x.id!==id)); }}
            onUpdateGastos={async (v)=>{
              const lista = viagens.map(x=>x.id===v.id?v:x);
              await salvarViagens(lista);
              // Sincronizar PDFs na notificação do consultor
              if (v.consultor && (v.pdfHotel || v.pdfVoo)) {
                try {
                  const key = "notif_viagem_"+v.consultor.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
                  const snap = await getDoc(doc(db,"app_data",key));
                  if (snap.exists()) {
                    const notifs = (snap.data().value||[]).map(n => n.id===v.id ? {...n, pdfHotel:v.pdfHotel, pdfHotelName:v.pdfHotelName, pdfVoo:v.pdfVoo, pdfVooName:v.pdfVooName} : n);
                    await setDoc(doc(db,"app_data",key), { value: notifs });
                  }
                } catch(e) { console.warn(e); }
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO: GESTÃO DE PROJETOS
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// KANBAN BOARD (componente separado para não violar regras de hooks)
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// PAINEL DE OS DO CONSULTOR
// ─────────────────────────────────────────────────────────────────────────────
function PainelOSConsultor({ consultorName, scheduleData, setScheduleData, setScheduleVersion, clientList, emailConfig, currentUser, onSaveEntry, onSaveOS, theme: T, modoGestor }) {
  const [osEntry, setOsEntry] = React.useState(null);
  const [filtroStatus, setFiltroStatus] = React.useState("");
  const [busca, setBusca] = React.useState("");
  const [entradasFirestore, setEntradasFirestore] = React.useState(null); // null = ainda carregando
  const [recarregando, setRecarregando] = React.useState(false);

  const OS_STATUS = {
    em_andamento: { label:"Em andamento", color:"#6c63ff", bg:"#6c63ff18", icon:"⚙️", desc:"OS em execução pelo consultor" },
    pendente:     { label:"Pendente",     color:"#f5a623", bg:"#f5a62318", icon:"⏳", desc:"Aguardando revisão ou aprovação" },
    concluida:    { label:"Concluída",    color:"#22d3a0", bg:"#22d3a018", icon:"✅", desc:"Atividade finalizada" },
    aprovada:     { label:"Aprovada",     color:"#22d3a0", bg:"#22d3a018", icon:"👍", desc:"Aprovada por gestor — não editável" },
    contestada:   { label:"Contestada",   color:"#f5a623", bg:"#f5a62318", icon:"⚠️", desc:"Gestor solicitou ajuste" },
    rejeitada:    { label:"Rejeitada",    color:"#f04f5e", bg:"#f04f5e18", icon:"👎", desc:"Reprovada pelo gestor" },
    cancelada:    { label:"Cancelada",    color:"#f04f5e", bg:"#f04f5e18", icon:"❌", desc:"OS cancelada" },
  };

  const osBloquada = (os) => os.osStatus === "aprovada" && !!os.osAvaliadoPor;
  const podeEditar = !modoGestor;

  // Carregar diretamente do Firestore — garante dados atualizados mesmo após aprovação em outra sessão
  const carregarDoFirestore = React.useCallback(async () => {
    setRecarregando(true);
    try {
      const snap = await getDoc(doc(db, "app_data", "schedule_" + consultorName));
      const entradas = snap.exists() ? (snap.data().value || []) : (scheduleData[consultorName] || []);
      setEntradasFirestore(entradas);
      // Sincronizar estado global para atualizar calendário
      if (setScheduleData) setScheduleData(prev => ({ ...prev, [consultorName]: entradas }));
      if (setScheduleVersion) setScheduleVersion(v => v + 1);
    } catch(e) {
      setEntradasFirestore(scheduleData[consultorName] || []);
    }
    setRecarregando(false);
  }, [consultorName]);

  // Carregar na montagem e quando consultorName mudar
  React.useEffect(() => {
    carregarDoFirestore();
  }, [carregarDoFirestore]);

  // Sincronizar quando scheduleData mudar externamente (ex: após handleSaveOS)
  React.useEffect(() => {
    if (scheduleData[consultorName]) {
      setEntradasFirestore(scheduleData[consultorName]);
    }
  }, [scheduleData, consultorName]);

  // Usar dados do Firestore se disponíveis, senão scheduleData como fallback
  const entradas = entradasFirestore !== null ? entradasFirestore : (scheduleData[consultorName] || []);

  // Coletar todas as OS
  const todasOS = React.useMemo(() => {
    return entradas
      .filter(e => e.osNumero)
      .sort((a,b) => {
        const na = parseInt(a.osNumero?.replace(/\D/g,""))||0;
        const nb = parseInt(b.osNumero?.replace(/\D/g,""))||0;
        return nb - na;
      });
  }, [entradas]);

  // Filtrar
  const osFiltradas = React.useMemo(() => {
    return todasOS.filter(os => {
      if (filtroStatus && os.osStatus !== filtroStatus) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase();
        return (os.osNumero||"").toLowerCase().includes(q)
          || (os.client||"").toLowerCase().includes(q)
          || (os.atividades||"").toLowerCase().includes(q)
          || (os.osSistema||"").toLowerCase().includes(q);
      }
      return true;
    });
  }, [todasOS, filtroStatus, busca]);

  // Contadores por status
  const contadores = React.useMemo(() => {
    const c = {};
    todasOS.forEach(os => { c[os.osStatus||"em_andamento"] = (c[os.osStatus||"em_andamento"]||0)+1; });
    return c;
  }, [todasOS]);

  const inp = { padding:"7px 12px",borderRadius:"8px",border:"1px solid "+T.inputBorder,background:T.inputBg,color:T.inputColor,fontSize:"12px",fontFamily:"inherit" };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:"24px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"12px",flexWrap:"wrap" }}>
        <div>
          <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:900,color:T.heading,margin:"0 0 4px",letterSpacing:"-0.3px" }}>
            📋 {modoGestor ? `OS de ${consultorName.split(" ")[0]}` : "Minhas Ordens de Serviço"}
          </h2>
          <p style={{ fontSize:"12px",color:T.text2,margin:0,display:"flex",alignItems:"center",gap:"8px" }}>
            {entradasFirestore===null ? "Carregando..." : `${todasOS.length} OS registrada${todasOS.length!==1?"s":""}`}
            {modoGestor && <span style={{ padding:"2px 8px",borderRadius:"99px",background:"#f5a62318",border:"1px solid #f5a62330",color:"#f5a623",fontSize:"10px",fontWeight:600 }}>👁 Modo visualização</span>}
          </p>
        </div>
        <button onClick={carregarDoFirestore} disabled={recarregando}
          style={{ padding:"7px 14px",borderRadius:"8px",border:"1px solid "+T.border,background:T.surface,color:recarregando?T.text3:T.text2,cursor:recarregando?"wait":"pointer",fontSize:"12px",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"6px",flexShrink:0 }}>
          <span style={{ display:"inline-block",animation:recarregando?"spin .7s linear infinite":"none" }}>🔄</span>
          {recarregando?"Atualizando...":"Atualizar"}
        </button>
      </div>

      {/* Cards de contagem por status */}
      <div style={{ display:"flex",gap:"10px",flexWrap:"wrap",marginBottom:"20px" }}>
        {Object.entries(OS_STATUS).map(([k,v])=> contadores[k]>0 ? (
          <div key={k} onClick={()=>setFiltroStatus(filtroStatus===k?"":k)}
            style={{ padding:"10px 16px",borderRadius:"10px",background:filtroStatus===k?v.color:T.surface,border:"1px solid "+(filtroStatus===k?v.color:T.border),cursor:"pointer",transition:"all .15s" }}>
            <div style={{ fontSize:"18px",marginBottom:"2px" }}>{v.icon}</div>
            <div style={{ fontSize:"16px",fontWeight:800,color:filtroStatus===k?"#fff":v.color }}>{contadores[k]}</div>
            <div style={{ fontSize:"10px",fontWeight:600,color:filtroStatus===k?"rgba(255,255,255,0.8)":T.text2,whiteSpace:"nowrap" }}>{v.label}</div>
          </div>
        ) : null)}
      </div>

      {/* Legenda de status — compacta */}
      <div style={{ background:T.surface,borderRadius:"10px",border:"1px solid "+T.border,padding:"10px 14px",marginBottom:"20px",display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap" }}>
        <span style={{ fontSize:"10px",fontWeight:700,color:T.text3,textTransform:"uppercase",letterSpacing:"0.5px",whiteSpace:"nowrap" }}>Legenda:</span>
        {Object.entries(OS_STATUS).map(([k,v])=>(
          <span key={k} style={{ display:"inline-flex",alignItems:"center",gap:"4px",padding:"3px 9px",borderRadius:"99px",background:v.bg,border:"1px solid "+v.color+"44",fontSize:"10px",fontWeight:600,color:v.color,whiteSpace:"nowrap" }}
            title={v.desc}>
            {v.icon} {v.label}{k==="aprovada"?" 🔒":""}
          </span>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:"flex",gap:"8px",marginBottom:"16px",flexWrap:"wrap" }}>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar OS, cliente, atividade..." style={{...inp,flex:1,minWidth:"200px"}}/>
        <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={inp}>
          <option value="">Todos os status</option>
          {Object.entries(OS_STATUS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        {(filtroStatus||busca) && (
          <button onClick={()=>{setFiltroStatus("");setBusca("");}} style={{ padding:"7px 12px",borderRadius:"8px",border:"1px solid "+T.border,background:"transparent",color:T.text2,cursor:"pointer",fontSize:"12px",fontFamily:"inherit" }}>✕ Limpar</button>
        )}
      </div>

      {/* Lista de OS */}
      {osFiltradas.length===0 ? (
        <div style={{ textAlign:"center",padding:"48px",background:T.surface,borderRadius:"14px",border:"1px solid "+T.border }}>
          <div style={{ fontSize:"36px",marginBottom:"12px" }}>📋</div>
          <div style={{ fontSize:"14px",color:T.text2 }}>{todasOS.length===0 ? "Nenhuma OS registrada ainda" : "Nenhuma OS encontrada com os filtros selecionados"}</div>
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
          {osFiltradas.map((os,i)=>{
            const st = OS_STATUS[os.osStatus||"em_andamento"]||OS_STATUS.em_andamento;
            const bloqueada = osBloquada(os);
            const editarBloqueado = bloqueada || !podeEditar;
            const pad = n=>String(n).padStart(2,"0");
            const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
            const dataStr = os.day && os.month ? `${pad(os.day)}/${pad(MESES.indexOf(os.month?.charAt(0).toUpperCase()+os.month?.slice(1).toLowerCase())+1)}/${os.year||""}` : "";
            return (
              <div key={os.id||i} style={{ background:T.surface,borderRadius:"12px",border:"1px solid "+T.border,overflow:"hidden",transition:"box-shadow .15s" }}>
                {/* Faixa colorida de status no topo */}
                <div style={{ height:"3px",background:st.color,opacity:0.7 }}/>
                <div style={{ display:"flex",alignItems:"center",padding:"14px 18px",gap:"14px",flexWrap:"wrap" }}>
                  {/* Número da OS */}
                  <div style={{ minWidth:"80px" }}>
                    <div style={{ fontSize:"10px",color:T.text3,fontWeight:700,textTransform:"uppercase",marginBottom:"2px" }}>Nº OS</div>
                    <div style={{ fontSize:"14px",fontWeight:800,color:T.heading }}>{os.osNumero||"—"}</div>
                  </div>
                  {/* Cliente */}
                  <div style={{ flex:1,minWidth:"120px" }}>
                    <div style={{ fontSize:"10px",color:T.text3,fontWeight:700,textTransform:"uppercase",marginBottom:"2px" }}>Cliente</div>
                    <div style={{ fontSize:"13px",fontWeight:600,color:T.text }}>{os.client||"—"}</div>
                  </div>
                  {/* Data */}
                  {dataStr && (
                    <div>
                      <div style={{ fontSize:"10px",color:T.text3,fontWeight:700,textTransform:"uppercase",marginBottom:"2px" }}>Data</div>
                      <div style={{ fontSize:"12px",color:T.text2 }}>📅 {dataStr}</div>
                    </div>
                  )}
                  {/* Status badge */}
                  <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"4px" }}>
                    <span style={{ padding:"4px 12px",borderRadius:"99px",background:st.bg,border:"1px solid "+st.color+"44",fontSize:"11px",fontWeight:700,color:st.color,display:"flex",alignItems:"center",gap:"4px" }}>
                      {st.icon} {st.label}
                    </span>
                    {bloqueada && (
                      <span style={{ fontSize:"10px",color:T.text3,display:"flex",alignItems:"center",gap:"3px" }}>
                        🔒 Aprovada por {os.osAvaliadoPor}
                        {os.osAvaliadoEm && <span style={{ color:T.text3 }}> · {new Date(os.osAvaliadoEm).toLocaleDateString("pt-BR")}</span>}
                      </span>
                    )}
                  </div>
                  {/* Botão editar — só para consultor, não para gestor em modo visualização */}
                  {!modoGestor && (
                    <button
                      onClick={()=>!editarBloqueado && setOsEntry(os)}
                      disabled={editarBloqueado}
                      title={bloqueada?"OS aprovada por gestor — não pode ser editada":"Editar OS"}
                      style={{ padding:"7px 16px",borderRadius:"8px",border:"none",background:editarBloqueado?"#1f1f2e":"linear-gradient(135deg,#6c63ff,#a78bfa)",color:editarBloqueado?T.text3:"#fff",cursor:editarBloqueado?"not-allowed":"pointer",fontWeight:700,fontSize:"12px",fontFamily:"inherit",flexShrink:0,opacity:editarBloqueado?0.5:1 }}>
                      {bloqueada?"🔒 Bloqueada":"✏️ Editar"}
                    </button>
                  )}
                </div>
                {/* Detalhes */}
                {(os.atividades||os.osSistema||os.osDescricao||os.osComentarioGestor) && (
                  <div style={{ padding:"12px 18px 14px",borderTop:"1px solid "+T.border+"88",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"10px" }}>
                    {os.osSistema && <div><span style={{ fontSize:"10px",color:T.text3,fontWeight:700,display:"block",marginBottom:"2px" }}>SISTEMA</span><span style={{ fontSize:"12px",color:T.text }}>{os.osSistema}</span></div>}
                    {os.atividades && <div style={{ gridColumn:"1/-1" }}><span style={{ fontSize:"10px",color:T.text3,fontWeight:700,display:"block",marginBottom:"2px" }}>ATIVIDADES</span><span style={{ fontSize:"12px",color:T.text,whiteSpace:"pre-wrap" }}>{os.atividades}</span></div>}
                    {os.osComentarioGestor && (
                      <div style={{ gridColumn:"1/-1",background:"#f5a62310",borderRadius:"8px",padding:"8px 12px",border:"1px solid #f5a62330" }}>
                        <span style={{ fontSize:"10px",color:"#f5a623",fontWeight:700,display:"block",marginBottom:"2px" }}>💬 COMENTÁRIO DO GESTOR</span>
                        <span style={{ fontSize:"12px",color:T.text }}>{os.osComentarioGestor}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de edição — só para consultor */}
      {osEntry && !modoGestor && (
        <OrdemServicoModal
          entry={osEntry}
          consultorName={consultorName}
          emailConfig={emailConfig}
          clientList={clientList}
          onSave={async (dadosOS) => {
            if (onSaveOS) await onSaveOS(dadosOS);
            else if (onSaveEntry) onSaveEntry(dadosOS);
            setOsEntry(null);
            setTimeout(carregarDoFirestore, 800);
          }}
          onClose={()=>setOsEntry(null)}
        />
      )}
    </div>
  );
}

function KanbanBoard({ tarefas, canEditProj, COLUNAS, COL_LABELS, PRIORIDADES, moverTarefa, removerTarefa, addTarefa }) {
  const [dragId, setDragId] = React.useState(null);
  const [dragOver, setDragOver] = React.useState(null);

  const onDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => { const el = document.getElementById("kcard-" + id); if (el) el.style.opacity = "0.4"; }, 0);
  };
  const onDragEnd = () => {
    const el = document.getElementById("kcard-" + dragId);
    if (el) el.style.opacity = "1";
    setDragId(null);
    setDragOver(null);
  };
  const onDragOver = (e, col) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(col); };
  const onDrop = (e, col) => {
    e.preventDefault();
    if (dragId && canEditProj) {
      const t = tarefas.find(t => t.id === dragId);
      if (t && t.coluna !== col) moverTarefa(dragId, col);
    }
    setDragId(null); setDragOver(null);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", overflowX: "auto", minWidth: "700px" }}>
      {COLUNAS.map(col => {
        const tarefasCol = tarefas.filter(t => t.coluna === col);
        const isOver = dragOver === col;
        return (
          <div key={col}
            onDragOver={canEditProj ? e => onDragOver(e, col) : undefined}
            onDragLeave={canEditProj ? () => setDragOver(null) : undefined}
            onDrop={canEditProj ? e => onDrop(e, col) : undefined}
            style={{ background: isOver ? "#1a1a2e" : "#111118", borderRadius: "12px", border: "1px solid " + (isOver ? "#6c63ff" : "#1f1f2e"), minHeight: "200px", transition: "background .15s,border-color .15s" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #1f1f2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#c8c8d8" }}>{COL_LABELS[col]}</span>
              <span style={{ fontSize: "10px", background: "#1f1f2e", color: "#6e6e88", padding: "1px 7px", borderRadius: "99px", fontWeight: 700 }}>{tarefasCol.length}</span>
            </div>
            <div style={{ padding: "8px", minHeight: "100px" }}>
              {isOver && dragId && tarefas.find(t => t.id === dragId)?.coluna !== col && (
                <div style={{ height: "4px", background: "#6c63ff", borderRadius: "99px", marginBottom: "6px", opacity: 0.8 }} />
              )}
              {tarefasCol.map(t => {
                const pr = PRIORIDADES[t.prioridade] || PRIORIDADES.media;
                const isDragging = dragId === t.id;
                return (
                  <div id={"kcard-" + t.id} key={t.id}
                    draggable={canEditProj}
                    onDragStart={canEditProj ? e => onDragStart(e, t.id) : undefined}
                    onDragEnd={canEditProj ? onDragEnd : undefined}
                    style={{ background: "#18181f", borderRadius: "8px", border: "1px solid " + (isDragging ? "#6c63ff44" : "#2a2a3a"), padding: "10px 12px", marginBottom: "6px", cursor: canEditProj ? "grab" : "default", userSelect: "none", transition: "box-shadow .15s", boxShadow: isDragging ? "0 4px 20px rgba(108,99,255,0.3)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px", marginBottom: "6px" }}>
                      {canEditProj && <span style={{ fontSize: "11px", color: "#3e3e55", flexShrink: 0, marginTop: 1, cursor: "grab" }}>⠿</span>}
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#c8c8d8", lineHeight: 1.4, flex: 1 }}>{t.nome}</span>
                      <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "99px", background: pr.color + "18", color: pr.color, fontWeight: 700, whiteSpace: "nowrap" }}>{pr.label}</span>
                    </div>
                    {t.responsavel && <div style={{ fontSize: "10px", color: "#6e6e88", marginBottom: "6px" }}>👤 {t.responsavel}</div>}
                    {t.dataInicio && <div style={{ fontSize: "9px", color: "#3e3e55", marginBottom: "6px" }}>📅 {t.dataInicio}{t.dataFim ? " → " + t.dataFim : ""}</div>}
                    {typeof t.progresso === "number" && t.progresso > 0 && (
                      <div style={{ marginBottom: "6px" }}>
                        <div style={{ height: "3px", background: "#1f1f2e", borderRadius: "99px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: t.progresso + "%", background: pr.color, borderRadius: "99px" }} />
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                      {canEditProj && COLUNAS.filter(c => c !== col).map(c => (
                        <button key={c} onClick={() => moverTarefa(t.id, c)} title={"Mover para " + COL_LABELS[c]}
                          style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "99px", border: "1px solid #2a2a3a", background: "transparent", color: "#6e6e88", cursor: "pointer", fontFamily: "inherit" }}>
                          → {COL_LABELS[c].split(" ")[1]}
                        </button>
                      ))}
                      {canEditProj && <button onClick={() => removerTarefa(t.id)}
                        style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "99px", border: "1px solid #f04f5e44", background: "transparent", color: "#f04f5e", cursor: "pointer", fontFamily: "inherit" }}>✕</button>}
                    </div>
                  </div>
                );
              })}
              {canEditProj && <button onClick={() => addTarefa(col)}
                style={{ width: "100%", padding: "7px", borderRadius: "8px", border: "1px dashed #2a2a3a", background: "transparent", color: "#3e3e55", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", marginTop: "4px" }}>
                + Adicionar
              </button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABA IMPORTAR MS PROJECT (componente separado para não violar regras de hooks)
// ─────────────────────────────────────────────────────────────────────────────
function AbaImportarMSProject({ proj, consultores, atualizarProjeto, onSaveEntry, setAbaProj }) {
  const [importStep, setImportStep] = React.useState("upload");
  const [importTarefas, setImportTarefas] = React.useState([]);
  const [mapeamento, setMapeamento] = React.useState({});
  const [importLog, setImportLog] = React.useState([]);
  const [gerarAgenda, setGerarAgenda] = React.useState(true);
  const [importing, setImporting] = React.useState(false);
  const consultoresMeta = window.__consultoresMeta || [];

  const recursosUnicos = [...new Set(importTarefas.flatMap(t => t.recursos || []).filter(Boolean))];

  const parseXML = (xmlStr) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlStr, "text/xml");
      const tarefas = [];
      doc.querySelectorAll("Task").forEach(task => {
        const uid = task.querySelector("UID")?.textContent;
        const nome = task.querySelector("n")?.textContent || task.querySelector("Name")?.textContent;
        const ini = task.querySelector("Start")?.textContent?.slice(0, 10);
        const fim = task.querySelector("Finish")?.textContent?.slice(0, 10);
        const pct = task.querySelector("PercentComplete")?.textContent || "0";
        const summary = task.querySelector("Summary")?.textContent === "1";
        const milestone = task.querySelector("Milestone")?.textContent === "1";
        const predecessoras = [];
        task.querySelectorAll("PredecessorLink UID, PredecessorLink PredecessorUID").forEach(p => predecessoras.push(p.textContent));
        if (!nome || !uid) return;
        tarefas.push({ id: uid, idOriginal: uid, nome, dataInicio: ini, dataFim: fim, progresso: Number(pct), predecessoras, isSummary: summary, isMilestone: milestone, recursos: [], coluna: "backlog" });
      });
      // Atribuições
      const recursos = {};
      doc.querySelectorAll("Resource").forEach(r => {
        const ruid = r.querySelector("UID")?.textContent;
        const rnome = r.querySelector("n")?.textContent || r.querySelector("Name")?.textContent;
        if (ruid && rnome) recursos[ruid] = rnome;
      });
      doc.querySelectorAll("Assignment").forEach(a => {
        const tuid = a.querySelector("TaskUID")?.textContent;
        const ruid = a.querySelector("ResourceUID")?.textContent;
        const t = tarefas.find(t => t.id === tuid);
        if (!t || !ruid || !recursos[ruid]) return;
        if (!t.recursos.includes(recursos[ruid])) t.recursos.push(recursos[ruid]);
      });
      return tarefas.filter(t => t.nome && t.nome !== proj?.nome);
    } catch(e) { console.warn("Erro XML:", e); return null; }
  };

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;
    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
    const idx = (opts) => headers.findIndex(h => opts.includes(h));
    const iNome = idx(["nome","name","task","tarefa","taskname"]);
    const iIni  = idx(["inicio","start","datainicio","startdate"]);
    const iFim  = idx(["fim","finish","datafim","enddate","finishdate"]);
    const iPct  = idx(["pct","percentual","progresso","percentcomplete","done"]);
    const iRec  = idx(["recurso","resource","responsavel","assignedto"]);
    const iPred = idx(["predecessora","predecessor","depends","dependencia"]);
    if (iNome < 0) return null;
    return lines.slice(1).map((line, i) => {
      const cols = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ""));
      const nome = cols[iNome]; if (!nome) return null;
      return {
        id: String(i + 1), idOriginal: String(i + 1), nome,
        dataInicio: iIni >= 0 ? cols[iIni] || null : null,
        dataFim:    iFim >= 0 ? cols[iFim] || null : null,
        progresso:  iPct >= 0 ? Number(cols[iPct]) || 0 : 0,
        recursos:   iRec >= 0 ? cols[iRec].split(/[;,\/]/).map(r => r.trim()).filter(Boolean) : [],
        predecessoras: iPred >= 0 ? cols[iPred].split(/[;,]/).map(r => r.trim()).filter(Boolean) : [],
        isMilestone: false, isSummary: false, coluna: "backlog"
      };
    }).filter(Boolean);
  };

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.name.endsWith(".mpp")) { alert("Arquivo .mpp não pode ser lido pelo navegador. Use Arquivo > Salvar como > XML no MS Project."); return; }
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) { alert("Para Excel, exporte como CSV do MS Project primeiro."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target.result;
      const tarefas = file.name.endsWith(".xml") ? parseXML(content) : parseCSV(content);
      if (!tarefas || tarefas.length === 0) { alert("Não foi possível ler as tarefas. Verifique o formato do arquivo."); return; }
      const novoMapa = {};
      [...new Set(tarefas.flatMap(t => t.recursos || []))].forEach(recurso => {
        const meta = consultoresMeta.find(c => c.codigo && c.codigo.toLowerCase() === recurso.toLowerCase());
        if (meta) { novoMapa[recurso] = meta.name; return; }
        const metaNome = consultoresMeta.find(c => c.name.toLowerCase().includes(recurso.toLowerCase()) || recurso.toLowerCase().includes(c.name.split(" ")[0].toLowerCase()));
        // também tenta match direto por nome exato
        const direto = consultores.find(c => c.toLowerCase() === recurso.toLowerCase() || c.toLowerCase().startsWith(recurso.toLowerCase().split(" ")[0]));
        if (metaNome) novoMapa[recurso] = metaNome.name;
        else if (direto) novoMapa[recurso] = direto;
      });
      setImportTarefas(tarefas);
      setMapeamento(novoMapa);
      setImportStep("mapeamento");
    };
    reader.readAsText(file);
  };

  const executarImportacao = async () => {
    setImporting(true);
    const log = [];
    const tarefasAtualizadas = importTarefas.map(t => ({
      ...t,
      id: t.id || Date.now().toString(36) + Math.random().toString(36).slice(2),
      responsavel: t.recursos.map(r => mapeamento[r] || r).join(", "),
    }));
    await atualizarProjeto({ ...proj, tarefas: [...(proj.tarefas || []).filter(t => !t.importado), ...tarefasAtualizadas.map(t => ({ ...t, importado: true }))] });
    log.push(`✅ ${tarefasAtualizadas.length} tarefa(s) importada(s)`);
    if (gerarAgenda && onSaveEntry) {
      const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
      let agendaGeradas = 0;
      for (const tarefa of tarefasAtualizadas) {
        if (!tarefa.dataInicio || !tarefa.dataFim || tarefa.isMilestone || tarefa.isSummary) continue;
        const consultoresRec = tarefa.recursos.map(r => mapeamento[r]).filter(Boolean);
        for (const nomeConsultor of consultoresRec) {
          const ini = new Date(tarefa.dataInicio), fim = new Date(tarefa.dataFim);
          const porMesAno = {};
          const cur = new Date(ini);
          while (cur <= fim) {
            const dow = cur.getDay();
            if (dow !== 0 && dow !== 6) {
              const key = `${MONTHS_PT[cur.getMonth()]}_${cur.getFullYear()}`;
              if (!porMesAno[key]) porMesAno[key] = { month: MONTHS_PT[cur.getMonth()], year: cur.getFullYear(), days: [] };
              porMesAno[key].days.push(cur.getDate());
            }
            cur.setDate(cur.getDate() + 1);
          }
          for (const { month, year, days } of Object.values(porMesAno)) {
            onSaveEntry({ consultor: nomeConsultor, month, year, days, client: proj.cliente || proj.nome, type: "client", modalidade: "presencial", horaInicio: "08:00", horaFim: "17:00", intervalo: "", atividades: `Projeto: ${proj.nome}\nTarefa: ${tarefa.nome}`, notifyEmail: false });
            agendaGeradas++;
          }
        }
      }
      if (agendaGeradas > 0) log.push(`📅 ${agendaGeradas} entrada(s) de agenda gerada(s)`);
    }
    const semMapa = recursosUnicos.filter(r => !mapeamento[r]);
    if (semMapa.length) log.push(`⚠️ Sem mapeamento (sem agenda): ${semMapa.join(", ")}`);
    setImportLog(log);
    setImporting(false);
    setImportStep("done");
  };

  if (importStep === "upload") return (
    <div style={{ maxWidth: "600px" }}>
      <div style={{ background: "#111118", borderRadius: "14px", border: "1px solid #1f1f2e", padding: "28px", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0fa", margin: "0 0 6px" }}>📥 Importar do MS Project</h3>
        <p style={{ fontSize: "12px", color: "#6e6e88", margin: "0 0 20px", lineHeight: 1.6 }}>Suporte a <strong style={{ color: "#a78bfa" }}>XML</strong> (recomendado) e <strong style={{ color: "#a78bfa" }}>CSV</strong>. Para XML, use <em>Arquivo → Salvar como → XML</em> no MS Project.</p>
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", border: "2px dashed #2a2a3a", borderRadius: "12px", padding: "36px", cursor: "pointer", background: "#0d0d14" }}>
          <div style={{ fontSize: "40px" }}>📂</div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#c8c8d8" }}>Arraste o arquivo aqui ou clique para selecionar</div>
          <div style={{ fontSize: "11px", color: "#3e3e55" }}>.xml · .csv · .xlsx (exportar como CSV)</div>
          <input type="file" accept=".xml,.csv,.xlsx,.xls,.mpp" onChange={handleFile} style={{ display: "none" }} />
        </label>
      </div>
      <div style={{ background: "#0d0d14", borderRadius: "12px", border: "1px solid #1f1f2e", padding: "16px", fontSize: "12px", color: "#6e6e88", lineHeight: 1.8 }}>
        <strong style={{ color: "#a78bfa", display: "block", marginBottom: "6px" }}>📋 Campos capturados automaticamente:</strong>
        Nome da tarefa · Data início/fim · Recursos (consultores) · % concluído · Predecessoras · Milestones
      </div>
    </div>
  );

  if (importStep === "mapeamento") return (
    <div style={{ maxWidth: "640px" }}>
      <div style={{ background: "#111118", borderRadius: "14px", border: "1px solid #1f1f2e", padding: "24px", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f0f0fa", margin: "0 0 4px" }}>👥 Mapeamento de Recursos → Consultores GSC</h3>
        <p style={{ fontSize: "12px", color: "#6e6e88", margin: "0 0 18px" }}>Foram encontrados <strong style={{ color: "#a78bfa" }}>{recursosUnicos.length}</strong> recurso(s). Vincule cada um ao consultor do GSC.</p>
        {recursosUnicos.length === 0
          ? <div style={{ fontSize: "12px", color: "#6e6e88", padding: "12px", background: "#0d0d14", borderRadius: "8px" }}>Nenhum recurso encontrado — a agenda não será gerada automaticamente.</div>
          : recursosUnicos.map(recurso => (
            <div key={recurso} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px", background: "#0d0d14", borderRadius: "10px", padding: "10px 14px" }}>
              <div style={{ flex: 1, fontSize: "13px", color: "#c8c8d8", fontWeight: 600 }}>
                <span style={{ fontSize: "10px", color: "#6e6e88", display: "block", marginBottom: "2px" }}>Recurso MS Project</span>
                {recurso}
              </div>
              <div style={{ fontSize: "18px", color: "#3e3e55" }}>→</div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "10px", color: "#6e6e88", display: "block", marginBottom: "4px" }}>Consultor GSC</span>
                <select value={mapeamento[recurso] || ""} onChange={e => setMapeamento(p => ({ ...p, [recurso]: e.target.value }))}
                  style={{ padding: "7px 10px", borderRadius: "8px", border: "1px solid #2a2a3a", background: "#111118", color: "#c8c8d8", fontSize: "12px", width: "100%", fontFamily: "inherit" }}>
                  <option value="">— Não mapear —</option>
                  {consultores.map(c => {
                    const meta = consultoresMeta.find(m => m.name === c);
                    return <option key={c} value={c}>{c}{meta?.codigo ? " (" + meta.codigo + ")" : ""}</option>;
                  })}
                </select>
              </div>
            </div>
          ))
        }
        <div style={{ marginTop: "16px", padding: "12px 14px", background: "#0d0d14", borderRadius: "10px", border: "1px solid #1f1f2e", display: "flex", alignItems: "center", gap: "10px" }}>
          <input type="checkbox" id="gerarAgendaChk" checked={gerarAgenda} onChange={e => setGerarAgenda(e.target.checked)} style={{ accentColor: "#6c63ff", width: "16px", height: "16px" }} />
          <label htmlFor="gerarAgendaChk" style={{ fontSize: "13px", color: "#c8c8d8", cursor: "pointer" }}>📅 Gerar agenda automaticamente para consultores mapeados</label>
        </div>
      </div>
      <div style={{ background: "#111118", borderRadius: "12px", border: "1px solid #1f1f2e", padding: "16px", marginBottom: "16px", maxHeight: "220px", overflowY: "auto" }}>
        <div style={{ fontSize: "11px", color: "#6e6e88", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Preview — {importTarefas.length} tarefa(s)</div>
        {importTarefas.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", borderBottom: "1px solid #1a1a28" }}>
            <span style={{ fontSize: "11px", color: t.isMilestone ? "#f04f5e" : t.isSummary ? "#f5a623" : "#c8c8d8", flex: 1 }}>{t.isMilestone ? "🔷 " : t.isSummary ? "📁 " : ""}{t.nome}</span>
            <span style={{ fontSize: "10px", color: "#6e6e88", whiteSpace: "nowrap" }}>{t.dataInicio || "?"} → {t.dataFim || "?"}</span>
            <span style={{ fontSize: "10px", color: "#6c63ff", whiteSpace: "nowrap" }}>{t.progresso}%</span>
            <span style={{ fontSize: "10px", color: "#22d3a0", whiteSpace: "nowrap" }}>{t.recursos.map(r => mapeamento[r] ? mapeamento[r].split(" ")[0] : r).join(", ") || "—"}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button onClick={() => setImportStep("upload")} style={{ padding: "9px 18px", borderRadius: "10px", border: "1px solid #2a2a3a", background: "transparent", color: "#6e6e88", cursor: "pointer", fontWeight: 600, fontSize: "13px", fontFamily: "inherit" }}>← Voltar</button>
        <button onClick={executarImportacao} disabled={importing} style={{ padding: "9px 24px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#6c63ff,#a78bfa)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "13px", fontFamily: "inherit", opacity: importing ? 0.6 : 1 }}>
          {importing ? "⏳ Importando..." : "✅ Importar e gerar agenda"}
        </button>
      </div>
    </div>
  );

  if (importStep === "done") return (
    <div style={{ maxWidth: "560px" }}>
      <div style={{ background: "#111118", borderRadius: "14px", border: "1px solid #22d3a033", padding: "28px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#22d3a0", margin: "0 0 16px" }}>Importação concluída!</h3>
        {importLog.map((l, i) => <div key={i} style={{ fontSize: "13px", color: "#c8c8d8", marginBottom: "8px", textAlign: "left", background: "#0d0d14", borderRadius: "8px", padding: "10px 14px" }}>{l}</div>)}
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
          <button onClick={() => { setImportStep("upload"); setImportTarefas([]); setImportLog([]); }} style={{ padding: "9px 18px", borderRadius: "10px", border: "1px solid #2a2a3a", background: "transparent", color: "#6e6e88", cursor: "pointer", fontWeight: 600, fontSize: "13px", fontFamily: "inherit" }}>Nova importação</button>
          <button onClick={() => setAbaProj("gantt")} style={{ padding: "9px 22px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#6c63ff,#a78bfa)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "13px", fontFamily: "inherit" }}>Ver Gantt →</button>
        </div>
      </div>
    </div>
  );

  return null;
}

function ModuloProjetos({ currentUser, canEdit, canManage, isGestor, consultores, clients, scheduleData, onSaveEntry, theme: T }) {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projetoAtivo, setProjetoAtivo] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editandoProj, setEditandoProj] = useState(null);
  const [abaProj, setAbaProj] = useState("kanban"); // kanban | cronograma | horas

  const STATUS_PROJ = { planejamento:{label:"Planejamento",color:"#6e6e88"},andamento:{label:"Em andamento",color:"#6c63ff"},concluido:{label:"Concluído",color:"#22d3a0"},pausado:{label:"Pausado",color:"#f5a623"},cancelado:{label:"Cancelado",color:"#f04f5e"}};
  const COLUNAS = ["backlog","em_progresso","revisao","concluido"];
  const COL_LABELS = { backlog:"📋 Backlog", em_progresso:"⚙️ Em progresso", revisao:"👁 Revisão", concluido:"✅ Concluído" };
  const PRIORIDADES = { alta:{label:"Alta",color:"#f04f5e"}, media:{label:"Média",color:"#f5a623"}, baixa:{label:"Baixa",color:"#22d3a0"} };

  const inp = { padding:"9px 13px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"13px",width:"100%",boxSizing:"border-box",fontFamily:"inherit" };
  const lbl = { fontSize:"11px",color:"#6e6e88",fontWeight:700,display:"block",marginBottom:"6px",letterSpacing:"0.5px",textTransform:"uppercase" };

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "app_data", "projetos_mgmt"));
        if (snap.exists()) setProjetos(snap.data().value || []);
      } catch(e) { console.warn(e); }
      setLoading(false);
    };
    load();
  }, []);

  const salvarProjetos = async (lista) => {
    setProjetos(lista);
    await setDoc(doc(db, "app_data", "projetos_mgmt"), { value: lista });
  };

  const proj = projetos.find(p=>p.id===projetoAtivo);

  const atualizarProjeto = async (updated) => {
    const nova = projetos.map(p=>p.id===updated.id?updated:p);
    await salvarProjetos(nova);
  };

  const nomeUsuario = currentUser.consultorName || currentUser.nome || currentUser.username || "";

  const FormProjeto = ({ inicial, onSalvar, onCancelar }) => {
    const [form, setForm] = useState(inicial||{ nome:"", cliente:"", descricao:"", consultores:[], dataInicio:"", dataFim:"", status:"planejamento", progresso:0, visibilidade:"privado", editores:[], visualizadores:[] });
    const set = (k,v) => setForm(p=>({...p,[k]:v}));
    const toggleCons = (c) => setForm(p=>({...p,consultores:p.consultores.includes(c)?p.consultores.filter(x=>x!==c):[...p.consultores,c]}));
    const togglePerm = (campo, nome) => setForm(p=>({...p,[campo]:p[campo]?.includes(nome)?p[campo].filter(x=>x!==nome):[...(p[campo]||[]),nome]}));
    return (
      <div style={{ background:T.surface,borderRadius:"16px",border:"1px solid "+T.border,padding:"24px",maxWidth:"680px",marginBottom:"24px" }}>
        <h3 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"17px",fontWeight:900,color:"#f0f0fa",margin:"0 0 20px",letterSpacing:"-0.3px" }}>{inicial?"✏️ Editar Projeto":"📋 Novo Projeto"}</h3>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px" }}>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Nome do projeto</label>
            <input value={form.nome} onChange={e=>set("nome",e.target.value)} placeholder="Ex: Implantação Protheus — Empresa X" style={inp}/>
          </div>
          <div>
            <label style={lbl}>Cliente</label>
            <select value={form.cliente} onChange={e=>set("cliente",e.target.value)} style={inp}>
              <option value="">Selecione...</option>
              {clients.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Status</label>
            <select value={form.status} onChange={e=>set("status",e.target.value)} style={inp}>
              {Object.entries(STATUS_PROJ).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Data início</label>
            <input type="date" value={form.dataInicio} onChange={e=>set("dataInicio",e.target.value)} style={inp}/>
          </div>
          <div>
            <label style={lbl}>Data fim prevista</label>
            <input type="date" value={form.dataFim} onChange={e=>set("dataFim",e.target.value)} style={inp}/>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Descrição</label>
            <textarea value={form.descricao} onChange={e=>set("descricao",e.target.value)} rows={2} placeholder="Objetivo e escopo do projeto..." style={{...inp,resize:"vertical",lineHeight:1.5}}/>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Consultores envolvidos</label>
            <div style={{ display:"flex",flexWrap:"wrap",gap:"6px" }}>
              {consultores.map(c=>{
                const sel = form.consultores.includes(c);
                return <button key={c} onClick={()=>toggleCons(c)} style={{ padding:"5px 12px",borderRadius:"99px",border:"1px solid "+(sel?"#6c63ff":"#2a2a3a"),background:sel?"#6c63ff22":"transparent",color:sel?"#a78bfa":"#6e6e88",cursor:"pointer",fontSize:"12px",fontWeight:sel?700:400,fontFamily:"inherit" }}>{c.split(" ")[0]}</button>;
              })}
            </div>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Progresso ({form.progresso}%)</label>
            <input type="range" min={0} max={100} value={form.progresso} onChange={e=>set("progresso",Number(e.target.value))} style={{ width:"100%",accentColor:"#6c63ff" }}/>
          </div>

          {/* Permissões */}
          <div style={{ gridColumn:"1/-1", background:"#0d0d14", borderRadius:"12px", border:"1px solid #2a2a3a", padding:"14px 16px" }}>
            <div style={{ fontSize:"11px", color:"#6c63ff", fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:"12px" }}>🔐 Permissões de acesso</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
              <div>
                <label style={lbl}>Visibilidade</label>
                <select value={form.visibilidade||"privado"} onChange={e=>set("visibilidade",e.target.value)} style={inp}>
                  <option value="privado">🔒 Privado — só o criador</option>
                  <option value="equipe">👥 Equipe — consultores do projeto</option>
                  <option value="gestores">🏢 Gestores — admin/editor</option>
                  <option value="publico">🌐 Público — todos os usuários</option>
                </select>
              </div>
              <div style={{ fontSize:"11px", color:"#6e6e88", paddingTop:"20px", lineHeight:1.6 }}>
                {form.visibilidade==="privado" && "Apenas você pode visualizar e editar este projeto."}
                {form.visibilidade==="equipe" && "Consultores adicionados ao projeto podem visualizar. Você controla quem pode editar."}
                {form.visibilidade==="gestores" && "Visível para todos os gestores (admin, editor, diretores)."}
                {form.visibilidade==="publico" && "Todos os usuários do sistema podem visualizar."}
              </div>
            </div>
            {(form.visibilidade==="equipe") && (
              <div style={{ marginTop:"12px" }}>
                <label style={{...lbl, marginBottom:"8px"}}>Quem pode editar (além do criador)</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                  {consultores.map(c=>{
                    const sel = (form.editores||[]).includes(c);
                    return <button key={c} onClick={()=>togglePerm("editores",c)} style={{ padding:"4px 10px", borderRadius:"8px", border:"1px solid "+(sel?"#22d3a0":"#2a2a3a"), background:sel?"#22d3a018":"transparent", color:sel?"#22d3a0":"#6e6e88", cursor:"pointer", fontSize:"11px", fontWeight:sel?700:400, fontFamily:"inherit" }}>{sel?"✓ ":""}{c.split(" ")[0]}</button>;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display:"flex",gap:"10px",marginTop:"20px",justifyContent:"flex-end" }}>
          <button onClick={onCancelar} style={{ padding:"9px 18px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontWeight:600,fontSize:"13px",fontFamily:"inherit" }}>Cancelar</button>
          <button onClick={()=>onSalvar(form)} style={{ padding:"9px 22px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"13px",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44" }}>
            {inicial?"💾 Salvar":"✅ Criar projeto"}
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ textAlign:"center",padding:"60px",color:"#3e3e55" }}><div style={{ width:"28px",height:"28px",border:"3px solid #1f1f2e",borderTop:"3px solid #6c63ff",borderRadius:"50%",animation:"spin .7s linear infinite",margin:"0 auto 12px" }}/></div>;

  // Visão de detalhe do projeto
  if (proj) {
    const tarefas = proj.tarefas || [];
    const horas = proj.horas || [];
    const totalHoras = horas.reduce((s,h)=>s+Number(h.horas||0),0);

    const addTarefa = async (col) => {
      const nome = window.prompt("Nome da tarefa:");
      if (!nome) return;
      const t = { id:Date.now().toString(36), nome, coluna:col, responsavel:"", prioridade:"media", desc:"", criadoEm:new Date().toISOString() };
      await atualizarProjeto({...proj, tarefas:[...tarefas,t]});
    };
    const moverTarefa = async (id, novaCol) => {
      await atualizarProjeto({...proj, tarefas:tarefas.map(t=>t.id===id?{...t,coluna:novaCol}:t)});
    };
    const removerTarefa = async (id) => {
      await atualizarProjeto({...proj, tarefas:tarefas.filter(t=>t.id!==id)});
    };
    const addHora = async () => {
      const cons = window.prompt("Consultor:");
      if (!cons) return;
      const hrs = window.prompt("Horas trabalhadas:");
      if (!hrs) return;
      const desc = window.prompt("Descrição da atividade:");
      const h = { id:Date.now().toString(36), consultor:cons, horas:Number(hrs), desc:desc||"", data:new Date().toISOString().slice(0,10) };
      await atualizarProjeto({...proj, horas:[...horas,h]});
    };

    const st = STATUS_PROJ[proj.status]||STATUS_PROJ.planejamento;
    const canEditProj = canManage || proj.criadoPor===nomeUsuario || (proj.editores||[]).includes(nomeUsuario);
    return (
      <div>
        {/* Header do projeto */}
        <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px",flexWrap:"wrap" }}>
          <button onClick={()=>setProjetoAtivo(null)} style={{ padding:"6px 12px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontSize:"12px",fontFamily:"inherit" }}>← Voltar</button>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap" }}>
              <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:900,color:"#f0f0fa",margin:0,letterSpacing:"-0.3px" }}>{proj.nome}</h2>
              <span style={{ padding:"4px 12px",borderRadius:"99px",background:st.color+"18",border:"1px solid "+st.color+"44",fontSize:"11px",fontWeight:700,color:st.color }}>{st.label}</span>
              {!canEditProj && <span style={{ fontSize:"10px",color:"#6e6e88",background:"#1f1f2e",padding:"2px 8px",borderRadius:"99px" }}>👁 Somente leitura</span>}
            </div>
            <div style={{ fontSize:"12px",color:"#6e6e88",marginTop:"4px",display:"flex",gap:"12px",flexWrap:"wrap" }}>
              {proj.cliente && <span>🏢 {proj.cliente}</span>}
              {proj.dataInicio && <span>📅 {proj.dataInicio}{proj.dataFim?" → "+proj.dataFim:""}</span>}
              {proj.consultores?.length>0 && <span>👥 {proj.consultores.map(c=>c.split(" ")[0]).join(", ")}</span>}
              <span>⏱ {totalHoras}h registradas</span>
            </div>
          </div>
          {canEditProj && <button onClick={()=>{setEditandoProj(proj);setShowForm(true);setProjetoAtivo(null);}}
            style={{ padding:"7px 14px",borderRadius:"8px",border:"1px solid #6c63ff44",background:"#6c63ff18",color:"#a78bfa",cursor:"pointer",fontSize:"12px",fontWeight:600,fontFamily:"inherit" }}>✏️ Editar</button>}
        </div>

        {/* Barra de progresso */}
        <div style={{ background:"#111118",borderRadius:"10px",border:"1px solid #1f1f2e",padding:"12px 16px",marginBottom:"16px",display:"flex",alignItems:"center",gap:"14px" }}>
          <span style={{ fontSize:"12px",color:"#6e6e88",whiteSpace:"nowrap" }}>Progresso:</span>
          <div style={{ flex:1,height:"8px",background:"#1f1f2e",borderRadius:"99px",overflow:"hidden" }}>
            <div style={{ height:"100%",width:(proj.progresso||0)+"%",background:"linear-gradient(90deg,#6c63ff,#a78bfa)",borderRadius:"99px",transition:"width .4s" }}/>
          </div>
          <span style={{ fontSize:"13px",fontWeight:700,color:"#a78bfa",minWidth:"40px" }}>{proj.progresso||0}%</span>
        </div>

        {/* Abas */}
        <div style={{ display:"flex",gap:"2px",background:"#0d0d14",borderRadius:"10px",padding:"3px",border:"1px solid #2a2a3a",marginBottom:"20px",flexWrap:"wrap" }}>
          {[["kanban","📋 Kanban"],["gantt","📊 Gantt"],["importar","📥 Importar MS Project"],["cronograma","📈 Cronograma"],["horas","⏱ Horas"]].map(([v,l])=>(
            <button key={v} onClick={()=>setAbaProj(v)} style={{ padding:"6px 16px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"12px",fontFamily:"inherit",background:abaProj===v?"#6c63ff":"transparent",color:abaProj===v?"#fff":"#6e6e88" }}>{l}</button>
          ))}
        </div>

        {/* Kanban com Drag & Drop */}
        {abaProj==="kanban" && (
          <KanbanBoard
            tarefas={tarefas}
            canEditProj={canEditProj}
            COLUNAS={COLUNAS}
            COL_LABELS={COL_LABELS}
            PRIORIDADES={PRIORIDADES}
            moverTarefa={moverTarefa}
            removerTarefa={removerTarefa}
            addTarefa={addTarefa}
          />
        )}

        {/* Cronograma */}
        {abaProj==="cronograma" && (
          <div style={{ background:"#111118",borderRadius:"12px",border:"1px solid #1f1f2e",padding:"20px" }}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",margin:"0 0 16px" }}>📊 Linha do tempo</h3>
            {(!proj.dataInicio||!proj.dataFim) ? (
              <div style={{ textAlign:"center",padding:"32px",color:"#3e3e55",fontSize:"13px" }}>Defina as datas de início e fim do projeto para ver o cronograma.</div>
            ) : (
              <div>
                {/* Timeline visual */}
                {(() => {
                  const start = new Date(proj.dataInicio), end = new Date(proj.dataFim);
                  const total = (end-start)/(1000*60*60*24);
                  const hoje = new Date();
                  const elapsed = Math.max(0,Math.min(total,(hoje-start)/(1000*60*60*24)));
                  const pct = total>0?Math.round((elapsed/total)*100):0;
                  return (
                    <div>
                      <div style={{ display:"flex",justifyContent:"space-between",fontSize:"11px",color:"#6e6e88",marginBottom:"6px" }}>
                        <span>🚀 {proj.dataInicio}</span>
                        <span>🏁 {proj.dataFim}</span>
                      </div>
                      <div style={{ height:"16px",background:"#1f1f2e",borderRadius:"99px",overflow:"hidden",position:"relative",marginBottom:"8px" }}>
                        <div style={{ height:"100%",width:pct+"%",background:"linear-gradient(90deg,#6c63ff,#a78bfa)",borderRadius:"99px" }}/>
                        <div style={{ position:"absolute",top:0,left:(proj.progresso||0)+"%",width:"2px",height:"100%",background:"#22d3a0" }}/>
                      </div>
                      <div style={{ display:"flex",gap:"16px",fontSize:"11px",color:"#6e6e88" }}>
                        <span>⏳ Tempo decorrido: <strong style={{ color:"#a78bfa" }}>{pct}%</strong></span>
                        <span>📈 Progresso real: <strong style={{ color:"#22d3a0" }}>{proj.progresso||0}%</strong></span>
                        <span>📅 Duração total: <strong style={{ color:"#c8c8d8" }}>{total} dias</strong></span>
                      </div>
                    </div>
                  );
                })()}
                <div style={{ marginTop:"20px" }}>
                  <div style={{ fontSize:"11px",color:"#6e6e88",fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:"10px" }}>Tarefas por fase</div>
                  {COLUNAS.map(col=>{
                    const n = tarefas.filter(t=>t.coluna===col).length;
                    return n>0?(
                      <div key={col} style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"6px" }}>
                        <span style={{ fontSize:"12px",color:"#c8c8d8",minWidth:"140px" }}>{COL_LABELS[col]}</span>
                        <div style={{ flex:1,height:"6px",background:"#1f1f2e",borderRadius:"99px",overflow:"hidden" }}>
                          <div style={{ height:"100%",width:(n/tarefas.length*100)+"%",background:"#6c63ff",borderRadius:"99px" }}/>
                        </div>
                        <span style={{ fontSize:"11px",color:"#6e6e88",minWidth:"20px" }}>{n}</span>
                      </div>
                    ):null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Horas */}
        {abaProj==="horas" && (
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px" }}>
              <div style={{ fontSize:"13px",color:"#c8c8d8" }}>Total: <strong style={{ color:"#22d3a0",fontSize:"18px" }}>{totalHoras}h</strong></div>
              {canEditProj && <button onClick={addHora} style={{ padding:"7px 16px",borderRadius:"8px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"12px",fontFamily:"inherit" }}>+ Registrar horas</button>}
            </div>
            {horas.length===0 && <div style={{ textAlign:"center",padding:"32px",background:"#111118",borderRadius:"12px",border:"1px solid #1f1f2e",color:"#3e3e55",fontSize:"13px" }}>Nenhuma hora registrada</div>}
            <div style={{ display:"flex",flexDirection:"column",gap:"6px" }}>
              {horas.sort((a,b)=>b.data?.localeCompare(a.data||"")).map((h,i)=>(
                <div key={h.id||i} style={{ background:"#111118",borderRadius:"10px",border:"1px solid #1f1f2e",padding:"12px 16px",display:"flex",alignItems:"center",gap:"14px" }}>
                  <div style={{ width:"42px",height:"42px",borderRadius:"10px",background:"#22d3a018",border:"1px solid #22d3a033",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <span style={{ fontSize:"13px",fontWeight:800,color:"#22d3a0" }}>{h.horas}h</span>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:"13px",fontWeight:600,color:"#c8c8d8" }}>{h.consultor}</div>
                    <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"2px" }}>{h.desc||"—"}</div>
                  </div>
                  <div style={{ fontSize:"11px",color:"#3e3e55" }}>{h.data}</div>
                  {canEditProj && <button onClick={()=>atualizarProjeto({...proj,horas:horas.filter((_,j)=>j!==i)})} style={{ background:"none",border:"none",color:"#f04f5e",cursor:"pointer",fontSize:"13px" }}>✕</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ABA GANTT ── */}
        {abaProj==="gantt" && (()=>{
          const tarefasGantt = (proj.tarefas||[]).filter(t=>t.dataInicio&&t.dataFim);
          if (tarefasGantt.length===0) return (
            <div style={{ textAlign:"center",padding:"48px",background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e" }}>
              <div style={{ fontSize:"40px",marginBottom:"12px" }}>📊</div>
              <div style={{ fontSize:"14px",color:"#3e3e55",marginBottom:"8px" }}>Nenhuma tarefa com datas definidas</div>
              <div style={{ fontSize:"12px",color:"#3e3e55" }}>Importe do MS Project ou adicione datas nas tarefas do Kanban</div>
            </div>
          );

          // ── datas limites ──
          const toD = s => { const d=new Date(s); d.setHours(0,0,0,0); return d; };
          const allD = tarefasGantt.flatMap(t=>[toD(t.dataInicio),toD(t.dataFim)]);
          const minDate = new Date(Math.min(...allD)); minDate.setDate(minDate.getDate()-1);
          const maxDate = new Date(Math.max(...allD)); maxDate.setDate(maxDate.getDate()+3);
          const totalDias = Math.round((maxDate-minDate)/(864e5));
          const hoje = new Date(); hoje.setHours(0,0,0,0);

          // px por dia — adaptativo
          const PX = Math.max(22, Math.min(44, Math.floor(900/totalDias)));
          const ROW_H = 42;
          const HEAD_H = 52; // cabeçalho duplo: mês (24px) + dias (28px)
          const LABEL_W = 220;
          const COR = { concluido:"#22d3a0", em_progresso:"#6c63ff", revisao:"#f5a623", backlog:"#475569", milestone:"#f04f5e", summary:"#94a3b8" };

          // dias do período
          const dias = Array.from({length:totalDias},(_,i)=>{ const d=new Date(minDate); d.setDate(d.getDate()+i); return d; });

          // grupos de meses para o cabeçalho superior
          const meses = [];
          dias.forEach((d,i)=>{
            const key = d.getFullYear()*100+d.getMonth();
            const label = d.toLocaleDateString("pt-BR",{month:"short",year:"2-digit"}).replace(".","/");
            if (!meses.length||meses[meses.length-1].key!==key) meses.push({key,label,col:i,span:1});
            else meses[meses.length-1].span++;
          });

          const posX   = d => Math.round((toD(d)-minDate)/864e5)*PX;
          const barW   = (s,e) => Math.max(PX, Math.round((toD(e)-toD(s))/864e5+1)*PX);
          const xHoje  = Math.round((hoje-minDate)/864e5)*PX;
          const mostrarHoje = hoje>=minDate && hoje<=maxDate;

          const gridW = totalDias*PX;
          const gridH = tarefasGantt.length*ROW_H;

          return (
            <div style={{ background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e",overflow:"hidden",fontFamily:"inherit" }}>

              {/* ── Cabeçalho fixo ── */}
              <div style={{ padding:"12px 18px 10px",borderBottom:"1px solid #1f1f2e",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap" }}>
                <span style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa" }}>📊 Gráfico de Gantt</span>
                <span style={{ fontSize:"11px",color:"#6e6e88",background:"#1f1f2e",padding:"2px 8px",borderRadius:"99px" }}>{tarefasGantt.length} tarefas</span>
                <span style={{ fontSize:"11px",color:"#6e6e88",marginLeft:"auto" }}>
                  {proj.dataInicio&&proj.dataFim ? `${proj.dataInicio} → ${proj.dataFim}` : ""}
                </span>
              </div>

              {/* ── Legenda ── */}
              <div style={{ padding:"6px 18px",borderBottom:"1px solid #1a1a28",display:"flex",gap:"14px",flexWrap:"wrap" }}>
                {[["Concluído","#22d3a0"],["Em progresso","#6c63ff"],["Revisão","#f5a623"],["Backlog","#475569"],["Milestone","#f04f5e"]].map(([l,c])=>(
                  <span key={l} style={{ display:"flex",alignItems:"center",gap:"5px",fontSize:"10px",color:"#6e6e88" }}>
                    <span style={{ width:l==="Milestone"?10:12,height:l==="Milestone"?10:8,borderRadius:l==="Milestone"?"50%":3,background:c,display:"inline-block",flexShrink:0 }}/>
                    {l}
                  </span>
                ))}
                {mostrarHoje && <span style={{ display:"flex",alignItems:"center",gap:"5px",fontSize:"10px",color:"#22d3a0" }}>
                  <span style={{ width:2,height:10,background:"#22d3a0",display:"inline-block" }}/>Hoje
                </span>}
              </div>

              {/* ── Grid principal ── */}
              <div style={{ overflowX:"auto",overflowY:"auto",maxHeight:"560px" }}>
                <div style={{ display:"flex",minWidth:LABEL_W+gridW+"px" }}>

                  {/* Coluna de nomes — sticky left */}
                  <div style={{ width:LABEL_W,flexShrink:0,borderRight:"1px solid #2a2a3a",position:"sticky",left:0,zIndex:10,background:"#111118" }}>
                    {/* espaço do cabeçalho */}
                    <div style={{ height:HEAD_H,borderBottom:"1px solid #2a2a3a",background:"#0d0d14" }}/>
                    {/* linhas de nome */}
                    {tarefasGantt.map((t,i)=>(
                      <div key={t.id||i} style={{ height:ROW_H,display:"flex",alignItems:"center",padding:"0 10px 0 14px",borderBottom:"1px solid #1a1a28",background:t.isSummary?"#0f1a2e":i%2===0?"#111118":"#0f0f1a",gap:6 }}>
                        {t.isMilestone && <span style={{ fontSize:10,flexShrink:0 }}>🔷</span>}
                        {t.isSummary  && <span style={{ fontSize:10,flexShrink:0 }}>📁</span>}
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:11,fontWeight:t.isSummary?700:500,color:t.isSummary?"#a78bfa":t.isMilestone?"#f04f5e":"#c8c8d8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:LABEL_W-36 }}>{t.nome}</div>
                          {t.responsavel && <div style={{ fontSize:9,color:"#3e3e55",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>👤 {t.responsavel}</div>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Área do gráfico */}
                  <div style={{ flex:1,position:"relative",minWidth:gridW }}>

                    {/* ── Cabeçalho: linha de meses ── */}
                    <div style={{ height:24,display:"flex",background:"#0d0d14",borderBottom:"1px solid #1f1f2e",position:"sticky",top:0,zIndex:9 }}>
                      {meses.map(m=>(
                        <div key={m.key} style={{ width:m.span*PX,flexShrink:0,borderRight:"1px solid #2a2a3a",padding:"0 6px",display:"flex",alignItems:"center",overflow:"hidden" }}>
                          <span style={{ fontSize:10,fontWeight:700,color:"#6e6e88",whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:"0.5px" }}>{m.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* ── Cabeçalho: linha de dias ── */}
                    <div style={{ height:28,display:"flex",background:"#0a0a14",borderBottom:"1px solid #2a2a3a",position:"sticky",top:24,zIndex:9 }}>
                      {dias.map((d,i)=>{
                        const isWknd = d.getDay()===0||d.getDay()===6;
                        const isHoje = d.getTime()===hoje.getTime();
                        return (
                          <div key={i} style={{ width:PX,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:isHoje?"#22d3a022":isWknd?"#06060d":"transparent",borderRight:"1px solid #1a1a28" }}>
                            <span style={{ fontSize:9,color:isHoje?"#22d3a0":isWknd?"#2a2a3a":"#3e3e55",fontWeight:isHoje?800:400 }}>{d.getDate()}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* ── Área das barras ── */}
                    <div style={{ position:"relative",height:gridH }}>

                      {/* Grid de fundo: colunas de dia */}
                      {dias.map((d,i)=>{
                        const isWknd = d.getDay()===0||d.getDay()===6;
                        if (!isWknd) return null;
                        return <div key={i} style={{ position:"absolute",top:0,left:i*PX,width:PX,height:"100%",background:"#06060d",pointerEvents:"none" }}/>;
                      })}

                      {/* Linhas horizontais de linha */}
                      {tarefasGantt.map((_,i)=>(
                        <div key={i} style={{ position:"absolute",top:i*ROW_H,left:0,right:0,height:ROW_H,background:i%2===0?"transparent":"rgba(255,255,255,0.01)",borderBottom:"1px solid #1a1a28" }}/>
                      ))}

                      {/* Linha de hoje */}
                      {mostrarHoje && (
                        <div style={{ position:"absolute",top:0,left:xHoje+PX/2,width:2,height:"100%",background:"#22d3a0",opacity:0.7,pointerEvents:"none",zIndex:4 }}>
                          <div style={{ position:"absolute",top:-4,left:-18,width:38,height:14,background:"#22d3a0",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center" }}>
                            <span style={{ fontSize:8,fontWeight:800,color:"#000" }}>HOJE</span>
                          </div>
                        </div>
                      )}

                      {/* SVG apenas para setas de dependência */}
                      <svg style={{ position:"absolute",top:0,left:0,width:gridW,height:gridH,overflow:"visible",pointerEvents:"none",zIndex:3 }}>
                        <defs>
                          <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                            <path d="M0,0 L6,3 L0,6 Z" fill="#f5a623" opacity="0.8"/>
                          </marker>
                        </defs>
                        {tarefasGantt.map((t,i)=>
                          (t.predecessoras||[]).map(predId=>{
                            const pi = tarefasGantt.findIndex(p=>p.id===predId||p.idOriginal===predId);
                            if (pi<0) return null;
                            const pred = tarefasGantt[pi];
                            const x1 = posX(pred.dataFim)+barW(pred.dataInicio,pred.dataFim);
                            const y1 = pi*ROW_H+ROW_H/2;
                            const x2 = posX(t.dataInicio);
                            const y2 = i*ROW_H+ROW_H/2;
                            const mx = (x1+x2)/2;
                            return <path key={`${t.id}-${predId}`} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} stroke="#f5a623" strokeWidth="1.5" fill="none" strokeDasharray="5,3" opacity="0.6" markerEnd="url(#arr)"/>;
                          })
                        )}
                      </svg>

                      {/* Barras das tarefas */}
                      {tarefasGantt.map((t,i)=>{
                        const x = posX(t.dataInicio);
                        const w = barW(t.dataInicio,t.dataFim);
                        const pct = Math.min(100,Math.max(0,t.progresso||0));
                        const top = i*ROW_H;
                        const cor = t.isMilestone ? COR.milestone : t.isSummary ? COR.summary : (COR[t.coluna]||"#6c63ff");

                        if (t.isMilestone) return (
                          <div key={t.id||i} title={t.nome} style={{ position:"absolute",top:top+ROW_H/2-9,left:x+PX/2-9,width:18,height:18,background:cor,transform:"rotate(45deg)",borderRadius:3,zIndex:2,boxShadow:`0 0 8px ${cor}88` }}/>
                        );

                        if (t.isSummary) return (
                          <div key={t.id||i} title={t.nome} style={{ position:"absolute",top:top+ROW_H/2-5,left:x,width:w,height:10,background:cor,opacity:0.6,borderRadius:2,zIndex:2 }}>
                            <div style={{ height:"100%",width:pct+"%",background:cor,borderRadius:2,opacity:0.9 }}/>
                          </div>
                        );

                        return (
                          <div key={t.id||i} title={`${t.nome} — ${pct}%`} style={{ position:"absolute",top:top+7,left:x,width:w,height:ROW_H-14,borderRadius:6,overflow:"hidden",zIndex:2,cursor:"default" }}>
                            {/* fundo */}
                            <div style={{ position:"absolute",inset:0,background:cor,opacity:0.2,borderRadius:6 }}/>
                            {/* barra de progresso */}
                            <div style={{ position:"absolute",top:0,left:0,width:pct+"%",height:"100%",background:cor,opacity:0.85,borderRadius:6,transition:"width .3s" }}/>
                            {/* texto */}
                            {w>48 && (
                              <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
                                <span style={{ fontSize:10,fontWeight:700,color:"#fff",textShadow:"0 1px 3px rgba(0,0,0,0.7)",whiteSpace:"nowrap" }}>{pct}%</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── ABA IMPORTAR MS PROJECT ── */}
        {abaProj==="importar" && (
          <AbaImportarMSProject
            proj={proj}
            consultores={consultores}
            atualizarProjeto={atualizarProjeto}
            onSaveEntry={onSaveEntry}
            setAbaProj={setAbaProj}
          />
        )}
      </div>
    );
  }

  // Lista de projetos
  // Calcular projetos visíveis para o usuário atual
  const projetosVisiveis = projetos.filter(p => {
    if (canManage) return true;
    if (p.criadoPor === nomeUsuario) return true;
    const vis = p.visibilidade || "privado";
    if (vis === "publico") return true;
    if (vis === "gestores" && isGestor) return true;
    if (vis === "equipe" && (p.consultores||[]).includes(nomeUsuario)) return true;
    if ((p.editores||[]).includes(nomeUsuario)) return true;
    return false;
  });

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"24px",flexWrap:"wrap",gap:"12px" }}>
        <div>
          <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:900,color:"#f0f0fa",margin:"0 0 4px",letterSpacing:"-0.3px" }}>📋 Gestão de Projetos</h2>
          <p style={{ fontSize:"12px",color:"#3e3e55",margin:0 }}>{projetosVisiveis.length} projeto{projetosVisiveis.length!==1?"s":""} visível{projetosVisiveis.length!==1?"is":""}</p>
        </div>
        {canEdit && <button onClick={()=>{setEditandoProj(null);setShowForm(true);}} style={{ padding:"8px 18px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",fontWeight:700,fontSize:"12px",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44" }}>+ Novo Projeto</button>}
      </div>

      {showForm && (
        <FormProjeto inicial={editandoProj}
          onSalvar={async (dados)=>{
            let nova;
            if (editandoProj) {
              nova=projetos.map(p=>p.id===editandoProj.id?{...dados,id:editandoProj.id,criadoPor:editandoProj.criadoPor||nomeUsuario}:p);
            } else {
              nova=[...projetos,{...dados,id:Date.now().toString(36),tarefas:[],horas:[],criadoEm:new Date().toISOString(),criadoPor:nomeUsuario}];
            }
            await salvarProjetos(nova);
            setShowForm(false);setEditandoProj(null);
          }}
          onCancelar={()=>{setShowForm(false);setEditandoProj(null);}}
        />
      )}

      {projetosVisiveis.length===0 && !showForm && (
        <div style={{ textAlign:"center",padding:"60px",background:"#111118",borderRadius:"16px",border:"1px solid #1f1f2e" }}>
          <div style={{ fontSize:"48px",marginBottom:"14px" }}>📋</div>
          <div style={{ fontSize:"14px",color:"#3e3e55",marginBottom:"16px" }}>Nenhum projeto cadastrado</div>
          {canEdit && <button onClick={()=>setShowForm(true)} style={{ padding:"9px 22px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"13px",fontFamily:"inherit" }}>Criar primeiro projeto</button>}
        </div>
      )}

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:"14px" }}>
        {projetosVisiveis.map(p=>{
          const st = STATUS_PROJ[p.status]||STATUS_PROJ.planejamento;
          const concluidas = (p.tarefas||[]).filter(t=>t.coluna==="concluido").length;
          const totalTar = (p.tarefas||[]).length;
          const totalH = (p.horas||[]).reduce((s,h)=>s+Number(h.horas||0),0);
          const vis = p.visibilidade||"privado";
          const isCriador = p.criadoPor===nomeUsuario;
          const canEditProj = canManage || isCriador || (p.editores||[]).includes(nomeUsuario);
          const visIcons = { privado:"🔒", equipe:"👥", gestores:"🏢", publico:"🌐" };
          return (
            <div key={p.id} className="card-hover" onClick={()=>setProjetoAtivo(p.id)}
              style={{ background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e",padding:"18px 20px",cursor:"pointer",position:"relative",overflow:"hidden" }}>
              <div style={{ position:"absolute",top:0,left:0,right:0,height:"3px",background:st.color }}/>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px" }}>
                <div style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",lineHeight:1.3,flex:1,marginRight:"10px" }}>{p.nome}</div>
                <span style={{ padding:"3px 10px",borderRadius:"99px",background:st.color+"18",border:"1px solid "+st.color+"44",fontSize:"10px",fontWeight:700,color:st.color,whiteSpace:"nowrap" }}>{st.label}</span>
              </div>
              {p.cliente && <div style={{ fontSize:"11px",color:"#6e6e88",marginBottom:"8px" }}>🏢 {p.cliente}</div>}
              <div style={{ height:"4px",background:"#1f1f2e",borderRadius:"99px",overflow:"hidden",marginBottom:"10px" }}>
                <div style={{ height:"100%",width:(p.progresso||0)+"%",background:"linear-gradient(90deg,#6c63ff,#a78bfa)",borderRadius:"99px" }}/>
              </div>
              <div style={{ display:"flex",gap:"10px",fontSize:"11px",color:"#6e6e88",flexWrap:"wrap",justifyContent:"space-between",alignItems:"center" }}>
                <div style={{ display:"flex",gap:"10px" }}>
                  <span>📈 {p.progresso||0}%</span>
                  {totalTar>0 && <span>📋 {concluidas}/{totalTar} tarefas</span>}
                  {totalH>0 && <span>⏱ {totalH}h</span>}
                  {p.consultores?.length>0 && <span>👥 {p.consultores.length}</span>}
                </div>
                <span title={`Visibilidade: ${vis}`} style={{ fontSize:"11px",opacity:0.6 }}>
                  {visIcons[vis]||"🔒"} {isCriador?"criador":canEditProj?"editor":"leitor"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL DO CONSULTOR — embutido no app
// ─────────────────────────────────────────────────────────────────────────────

// Estilos compartilhados fora do componente para evitar re-criação a cada render
const _MAN_P    = { color:"#9090b0", margin:"0 0 12px", lineHeight:1.7 };
const _MAN_H4   = { fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:"14px", fontWeight:700, color:"#f0f0fa", margin:"0 0 4px" };
const _MAN_SNUM = { width:"28px", height:"28px", borderRadius:"8px", background:"#7c6ff720", border:"1px solid #7c6ff744", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:"12px", fontWeight:800, color:"#a78bfa", flexShrink:0 };

function ManualStepItem({ num, title, desc }) {
  return (
    <div style={{ display:"flex", gap:"14px", padding:"14px 0", borderBottom:"1px solid #1a1a28" }}>
      <div style={_MAN_SNUM}>{num}</div>
      <div>
        <div style={_MAN_H4}>{title}</div>
        <div style={{ ..._MAN_P, margin:0 }} dangerouslySetInnerHTML={{ __html: desc }}/>
      </div>
    </div>
  );
}

function ManualFieldItem({ field, req, desc }) {
  return (
    <tr>
      <td style={{ padding:"9px 12px", color:"#f0f0fa", fontWeight:600, fontSize:"13px", borderBottom:"1px solid #1a1a28", whiteSpace:"nowrap" }}>
        {field}{req && <span style={{ color:"#f04f5e", fontSize:"11px", marginLeft:"3px" }}>*</span>}
      </td>
      <td style={{ padding:"9px 12px", color:"#9090b0", fontSize:"13px", borderBottom:"1px solid #1a1a28", lineHeight:1.5 }} dangerouslySetInnerHTML={{ __html: desc }}/>
    </tr>
  );
}

function ManualConsultor({ theme: T }) {
  const [secaoAtiva, setSecaoAtiva] = useState("intro");

  const SECOES = [
    { id:"intro",    icon:"🏠", label:"Introdução" },
    { id:"acesso",   icon:"🔐", label:"Acesso ao sistema" },
    { id:"agenda",   icon:"📅", label:"Agenda" },
    { id:"os",       icon:"📋", label:"Ordens de Serviço" },
    { id:"grade",    icon:"🎓", label:"Grade de Conhecimento" },
    { id:"viagens",  icon:"🏨", label:"Viagem e Hospedagem" },
    { id:"traslado", icon:"🚗", label:"Traslado / RDA" },
    { id:"dicas",    icon:"💡", label:"Dicas e boas práticas" },
  ];

  const s    = { color:"#e8e8f5", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", lineHeight:1.75 };
  const h2   = { fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:"22px", fontWeight:900, color:"#fff", letterSpacing:"-0.3px", margin:"0 0 8px" };
  const h3   = { fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:"16px", fontWeight:800, color:"#f0f0fa", margin:"20px 0 8px" };
  const h4   = _MAN_H4;
  const p    = _MAN_P;
  const card = { background:"#13131e", border:"1px solid #1e1e2e", borderRadius:"12px", padding:"18px 20px", marginBottom:"12px" };

  const tip = (color, bg, border, icon, text) => (
    <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:"10px", padding:"12px 16px", display:"flex", gap:"10px", marginTop:"14px", marginBottom:"4px" }}>
      <span style={{ fontSize:"16px", flexShrink:0 }}>{icon}</span>
      <div style={{ fontSize:"13px", color, lineHeight:1.6 }} dangerouslySetInnerHTML={{ __html: text }}/>
    </div>
  );
  const tag = (label, color, bg) => (
    <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:"99px", fontSize:"10px", fontWeight:700, letterSpacing:"0.5px", background:bg, color, border:`1px solid ${color}44`, marginRight:"6px" }}>{label}</span>
  );
  const Step     = (props) => <ManualStepItem  {...props}/>;
  const FieldRow = (props) => <ManualFieldItem {...props}/>;

  const CONTEUDO = {
    intro: (
      <div style={s}>
        <div style={{ marginBottom:"28px" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"#7c6ff715", border:"1px solid #7c6ff733", borderRadius:"99px", padding:"4px 14px", fontSize:"11px", color:"#a78bfa", fontWeight:700, letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:"16px" }}>📖 Manual de Operação</div>
          <div style={h2}>Guia do <span style={{ color:"#7c6ff7" }}>Consultor</span></div>
          <div style={{ ...p, fontSize:"15px", fontWeight:300 }}>Tudo que você precisa saber para utilizar o GSC — Gestão de Serviços Consultores — de forma eficiente no seu dia a dia.</div>
          <div style={{ width:"40px", height:"3px", background:"linear-gradient(90deg,#7c6ff7,#22d3a0)", borderRadius:"2px", margin:"20px 0 24px" }}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          {[["📅","Agenda","Visualize sua agenda de atendimentos"],["📋","Ordens de Serviço","Preencha e acompanhe suas OS"],["🏨","Viagem e Hospedagem","Solicite viagens e acompanhe aprovações"],["🚗","Traslado / RDA","Registre despesas de deslocamento"],["🎓","Grade de Conhecimento","Declare seus conhecimentos em produtos TOTVS"],["💡","Dicas","Boas práticas para o dia a dia"]].map(([icon,title,desc])=>(
            <div key={title} style={card}>
              <div style={{ fontSize:"22px", marginBottom:"8px" }}>{icon}</div>
              <div style={h4}>{title}</div>
              <div style={{ ...p, margin:0, fontSize:"12px" }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    ),

    acesso: (
      <div style={s}>
        <div style={h2}>Acesso ao Sistema</div>
        <div style={{ ...p, marginBottom:"20px" }}>O GSC é acessado pelo navegador com e-mail e senha cadastrados pelo administrador.</div>
        <Step num={1} title="Abra o navegador" desc="Acesse o endereço do GSC fornecido pelo administrador."/>
        <Step num={2} title="Informe seu e-mail e senha" desc="Use as credenciais criadas pelo administrador. Se não lembrar a senha, clique em <strong style='color:#f0f0fa'>Esqueci minha senha</strong> para receber o link de redefinição."/>
        <Step num={3} title="Navegue pelo menu lateral" desc="Após o login, use o menu à esquerda para acessar os módulos: Agenda, Ordens de Serviço, Grade de Conhecimento, Viagem e Hospedagem e Traslado."/>
        {tip("#a78bfa","#7c6ff710","#7c6ff7","ℹ️","<strong>Seu perfil:</strong> Como consultor, você acessa apenas os módulos relacionados ao seu trabalho. Ações administrativas são exclusivas de gestores.")}
      </div>
    ),

    agenda: (
      <div style={s}>
        <div style={h2}>Agenda</div>
        <div style={{ ...p, marginBottom:"20px" }}>Visualize seus atendimentos e expedientes. A agenda é gerenciada pelo time administrativo, mas você pode consultar seus lançamentos e preencher Ordens de Serviço.</div>
        <div style={h3}>Visualizações disponíveis</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"20px" }}>
          {[["📊","Grade mensal","Visão geral do mês inteiro com indicadores por tipo de atividade"],["📆","Calendário","Formato calendário clássico com eventos coloridos por cliente"],["📅","Semanal","Semana atual com horários e detalhes de cada atendimento"],["📈","Estatísticas","Resumo de horas, clientes atendidos e distribuição de atividades"]].map(([icon,title,desc])=>(
            <div key={title} style={card}>
              <div style={{ fontSize:"20px", marginBottom:"6px" }}>{icon}</div>
              <div style={h4}>{title}</div>
              <div style={{ ...p, margin:0, fontSize:"12px" }}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={h3}>Como ver detalhes de um atendimento</div>
        <Step num={1} title="Clique em qualquer entrada" desc="Na visão Grade, Calendário ou Semanal, clique em uma entrada para abrir o painel de detalhes."/>
        <Step num={2} title="Veja os detalhes do atendimento" desc="O painel exibe cliente, modalidade (presencial/remoto), horários, atividades e status da OS."/>
        <Step num={3} title="Preencha a OS se necessário" desc="Se o atendimento não tiver OS, clique em <strong style='color:#f0f0fa'>📋 Preencher OS</strong> para criar a ordem de serviço."/>
        {tip("#22d3a0","#22d3a010","#22d3a0","✅","<strong>Dica:</strong> Use a visualização <strong style='color:#f0f0fa'>Semanal</strong> para uma visão rápida da semana com horários e clientes. O mês atual é carregado automaticamente ao abrir o módulo.")}
      </div>
    ),

    os: (
      <div style={s}>
        <div style={h2}>Ordens de Serviço</div>
        <div style={{ ...p, marginBottom:"20px" }}>A OS é o documento formal que registra as atividades realizadas em um atendimento. É gerada a partir de um lançamento da agenda e pode ser enviada por e-mail ao cliente.</div>
        <div style={h3}>Como preencher uma OS</div>
        <Step num={1} title="Acesse a entrada na Agenda" desc="Clique em um atendimento para abrir o painel de detalhes."/>
        <Step num={2} title='Clique em "📋 Preencher OS"' desc="O botão aparece no rodapé do painel. O modal da OS será aberto com o número gerado automaticamente."/>
        <Step num={3} title="Preencha os campos" desc="Informe o sistema atendido, descrição, horários de início/fim, intervalo e as atividades realizadas detalhadamente."/>
        <Step num={4} title="Salve ou envie por e-mail" desc="Clique em <strong style='color:#f0f0fa'>💾 Salvar OS</strong>. Para enviar ao cliente, expanda <strong style='color:#f0f0fa'>📧 Enviar por e-mail</strong> e confirme o destinatário."/>
        <div style={h3}>Campos da OS</div>
        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ borderBottom:"1px solid #1e1e2e" }}>
              <th style={{ padding:"10px 12px", fontSize:"10px", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:"#454560", textAlign:"left" }}>Campo</th>
              <th style={{ padding:"10px 12px", fontSize:"10px", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:"#454560", textAlign:"left" }}>Descrição</th>
            </tr></thead>
            <tbody>
              <FieldRow field="Nº OS" desc={`${tag("Auto","#22d3a0","#22d3a018")} Gerado automaticamente (ex: OS-0001). Não editável.`}/>
              <FieldRow field="Sistema" req desc="Sistema TOTVS atendido: Protheus, RM, Datasul ou Fluig."/>
              <FieldRow field="Descrição" desc="Breve descrição do tipo de atendimento."/>
              <FieldRow field="Status" req desc="Em andamento · Concluída · Pendente · Cancelada."/>
              <FieldRow field="Hora início/fim" req desc="Horário de início e término do atendimento."/>
              <FieldRow field="Intervalo" desc="Pausa em minutos (descontada do tempo total)."/>
              <FieldRow field="Atividades" req desc="Descrição detalhada de tudo realizado durante o atendimento."/>
              <FieldRow field="Destinatário" desc="E-mail do responsável no cliente. Preenchido automaticamente. Para múltiplos, separe por vírgula."/>
            </tbody>
          </table>
        </div>
        {tip("#f5a623","#f5a62310","#f5a623","⚠️","<strong>Atenção:</strong> Após enviar a OS, o gestor poderá <strong style='color:#f0f0fa'>Aprovar</strong>, <strong style='color:#f0f0fa'>Rejeitar</strong> ou <strong style='color:#f0f0fa'>Contestar</strong>. Você será notificado sobre o resultado.")}
      </div>
    ),

    grade: (
      <div style={s}>
        <div style={h2}>Grade de Conhecimento</div>
        <div style={{ ...p, marginBottom:"20px" }}>Declare seu nível de conhecimento em cada módulo dos produtos TOTVS. Essa informação é usada pela gestão para alocação de atendimentos.</div>
        <div style={h3}>Produtos disponíveis</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"20px" }}>
          {[["🔷","Protheus","43 módulos em 9 grupos (Financeiro, Fiscal, RH...)"],["🔶","RM","26 módulos em 7 grupos (Financeiro, Gestão de Pessoas...)"],["🟢","Datasul","57 módulos em 12 grupos abrangendo toda a suíte"],["🌊","Fluig","25 funcionalidades em 6 grupos (BPM, Portal, ECM...)"],["💻","Desenvolvedor","39 itens em 9 grupos (Linguagem, Banco, Frameworks...)"]].map(([icon,title,desc])=>(
            <div key={title} style={card}>
              <div style={{ fontSize:"20px", marginBottom:"6px" }}>{icon}</div>
              <div style={h4}>{title}</div>
              <div style={{ ...p, margin:0, fontSize:"12px" }}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={h3}>Níveis de conhecimento</div>
        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <tbody>
              {[["Especialista",["#f04f5e","#f04f5e18"],"Domínio avançado. Configura, implanta e resolve situações complexas de forma autônoma."],
                ["Sênior",["#f5a623","#f5a62318"],"Amplo conhecimento prático. Atua com independência em implantações e suporte avançado."],
                ["Pleno",["#a78bfa","#7c6ff718"],"Conhecimento funcional sólido. Realiza atendimentos com pouca supervisão."],
                ["Júnior",["#22d3a0","#22d3a018"],"Conhecimento básico ou em desenvolvimento. Realiza tarefas simples com apoio."]].map(([nivel,[color,bg],desc])=>(
                <tr key={nivel}>
                  <td style={{ padding:"10px 12px", borderBottom:"1px solid #1a1a28", whiteSpace:"nowrap" }}>{tag(nivel,color,bg)}</td>
                  <td style={{ padding:"10px 12px", color:"#9090b0", fontSize:"13px", borderBottom:"1px solid #1a1a28", lineHeight:1.5 }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={h3}>Como preencher</div>
        <Step num={1} title="Selecione o produto" desc="Escolha entre Protheus, RM, Datasul ou Fluig na parte superior da tela."/>
        <Step num={2} title="Percorra os módulos" desc="A tabela exibe todos os módulos agrupados por área. Clique no nível desejado para cada módulo que você domina."/>
        <Step num={3} title="Salve sua grade" desc="Clique em <strong style='color:#f0f0fa'>💾 Salvar Grade</strong>. As informações ficam visíveis para a gestão."/>
        {tip("#22d3a0","#22d3a010","#22d3a0","✅","<strong>Seja honesto:</strong> A grade é usada para alocação correta em projetos. Declarar nível acima do real pode comprometer a qualidade do atendimento.")}
      </div>
    ),

    viagens: (
      <div style={s}>
        <div style={h2}>Viagem e Hospedagem</div>
        <div style={{ ...p, marginBottom:"20px" }}>Solicite viagens com hospedagem e/ou passagem aérea. As solicitações passam por fluxo de aprovação hierárquica antes de serem confirmadas.</div>
        <div style={h3}>Fluxo de aprovação</div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap", margin:"14px 0 20px" }}>
          {[["⏳ Pendente","#a78bfa","#7c6ff718"],["→","#454560"],["🔀 Em aprovação","#a78bfa","#6c63ff18"],["→","#454560"],["✅ Aprovada","#22d3a0","#22d3a018"],["→","#454560"],["❌ Rejeitada","#f04f5e","#f04f5e18"]].map((item,i)=>
            Array.isArray(item)
              ? <div key={i} style={{ padding:"5px 14px", borderRadius:"99px", background:item[2], border:`1px solid ${item[1]}44`, fontSize:"11px", fontWeight:700, color:item[1] }}>{item[0]}</div>
              : <span key={i} style={{ color:item[1], fontSize:"14px" }}>{item}</span>
          )}
        </div>
        <div style={h3}>Como criar uma solicitação</div>
        <Step num={1} title="Clique em '+ Nova Solicitação'" desc="O formulário abre com seu nome já preenchido como solicitante."/>
        <Step num={2} title="Preencha os dados" desc="Informe seu setor, o cliente a visitar (endereço automático), motivo da viagem e destino da cobrança."/>
        <Step num={3} title="Informe hospedagem (se necessário)" desc="Preencha cidade, check-in e check-out. O número de noites é calculado automaticamente."/>
        <Step num={4} title="Inclua voo (se necessário)" desc="Ative <strong style='color:#f0f0fa'>Sim</strong> para voo e preencha aeroportos, datas e preferências de horário de ida e volta."/>
        <Step num={5} title="Envie a solicitação" desc="Clique em <strong style='color:#f0f0fa'>✅ Enviar solicitação</strong>. Ela entrará automaticamente no fluxo de aprovação."/>
        <div style={h3}>Documentos após aprovação</div>
        <div style={{ ...p }}>Quando aprovada e os documentos forem anexados, você verá ao expandir o card:</div>
        <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", margin:"10px 0 16px" }}>
          <div style={{ padding:"7px 14px", borderRadius:"9px", background:"#22d3a018", border:"1px solid #22d3a044", fontSize:"12px", fontWeight:700, color:"#22d3a0" }}>🏨 Reserva Hotel.pdf</div>
          <div style={{ padding:"7px 14px", borderRadius:"9px", background:"#a78bfa18", border:"1px solid #a78bfa44", fontSize:"12px", fontWeight:700, color:"#a78bfa" }}>✈️ Passagem.pdf</div>
        </div>
        {tip("#f5a623","#f5a62310","#f5a623","⚠️","<strong>Importante:</strong> Solicitações aprovadas não podem ser editadas. Para alterações, entre em contato com o responsável pela aprovação.")}
      </div>
    ),

    traslado: (
      <div style={s}>
        <div style={h2}>Traslado — RDA</div>
        <div style={{ ...p, marginBottom:"20px" }}>O RDA (Relatório de Despesas de Atendimento) é o documento formal para declarar despesas de deslocamento — kilometragem, pedágio, estacionamento, alimentação e outros.</div>
        <div style={h3}>Estrutura do RDA</div>
        <div style={{ ...card, padding:0, overflow:"hidden", marginBottom:"20px" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ borderBottom:"1px solid #1e1e2e" }}>
              <th style={{ padding:"10px 12px", fontSize:"10px", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:"#454560", textAlign:"left" }}>Seção</th>
              <th style={{ padding:"10px 12px", fontSize:"10px", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:"#454560", textAlign:"left" }}>O que preencher</th>
            </tr></thead>
            <tbody>
              <FieldRow field="🚗 RDA" desc="Código (automático), data emissão (automática), período início/fim, código técnico (automático), nome, motivo e unidade de origem."/>
              <FieldRow field="🏢 Cliente" desc="Selecione o cliente — código automático. Escolha a unidade de destino — endereço e KM carregados automaticamente."/>
              <FieldRow field="💲 Itens" desc="Adicione cada despesa com data, tipo (use 🔍 para selecionar), quantidade, valor unitário e valor teto."/>
              <FieldRow field="📎 Comprovantes" desc="Faça upload dos comprovantes em imagem ou PDF (máx. 5MB cada)."/>
            </tbody>
          </table>
        </div>
        <div style={h3}>Como criar um RDA</div>
        <Step num={1} title="Clique em '+ Nova RDA'" desc="O formulário abre com seu código técnico e nome já preenchidos automaticamente."/>
        <Step num={2} title="Preencha período e motivo" desc="Informe datas de início e fim, motivo e unidade de origem."/>
        <Step num={3} title="Selecione cliente e unidade" desc="Ao selecionar o cliente e a unidade de destino, endereço e KM são carregados automaticamente. O total ida e volta é calculado."/>
        <Step num={4} title="Adicione as despesas" desc="Clique em <strong style='color:#f0f0fa'>+ Nova Despesa</strong>, selecione o tipo pelo 🔍, preencha data, quantidade e valor."/>
        <Step num={5} title="Anexe comprovantes" desc="Na seção <strong style='color:#f0f0fa'>📎 Comprovantes</strong>, faça upload das fotos ou PDFs dos recibos."/>
        <Step num={6} title="Salve ou envie" desc="Use <strong style='color:#f0f0fa'>💾 Salvar rascunho</strong> para continuar depois, ou <strong style='color:#f0f0fa'>✅ Enviar RDA</strong> para submeter."/>
        {tip("#22d3a0","#22d3a010","#22d3a0","✅","<strong>Dica de KM:</strong> O campo KM IDA e VOLTA recebe o valor de ida. O sistema dobra automaticamente e calcula o valor de reembolso com base no valor/km cadastrado na unidade.")}
      </div>
    ),

    dicas: (
      <div style={s}>
        <div style={h2}>Dicas e Boas Práticas</div>
        <div style={{ ...p, marginBottom:"24px" }}>Pequenos hábitos que fazem grande diferença no uso eficiente do GSC.</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"24px" }}>
          {[["⏰","Preencha a OS no mesmo dia","Registrar as atividades logo após o atendimento garante mais precisão e evita esquecimentos."],
            ["📷","Fotografe os comprovantes","Guarde as fotos dos recibos antes de descartar. Comprovantes sem foto podem atrasar o reembolso."],
            ["🎓","Mantenha a grade atualizada","Atualize sua Grade sempre que concluir um treinamento ou adquirir experiência em novo módulo."],
            ["📝","Detalhe as atividades da OS","Uma OS bem preenchida facilita a aprovação e evita contestações."],
            ["🗓️","Solicite viagens com antecedência","Envie com pelo menos 5 dias úteis para garantir aprovação e reservas a tempo."],
            ["💾","Salve rascunhos do RDA","Use rascunho para salvar o progresso e completar o RDA depois."]
          ].map(([icon,title,desc])=>(
            <div key={title} style={card}>
              <div style={{ fontSize:"22px", marginBottom:"8px" }}>{icon}</div>
              <div style={h4}>{title}</div>
              <div style={{ ...p, margin:0, fontSize:"12px" }}>{desc}</div>
            </div>
          ))}
        </div>
        {tip("#a78bfa","#7c6ff710","#7c6ff7","💬","<strong>Precisa de ajuda?</strong> Em caso de dúvidas sobre o sistema, entre em contato com o administrador do GSC ou com o responsável pela sua equipe.")}
        <div style={{ marginTop:"40px", background:"#13131e", border:"1px solid #1e1e2e", borderRadius:"16px", padding:"28px", textAlign:"center" }}>
          <div style={{ fontSize:"28px", marginBottom:"10px" }}>⬡</div>
          <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:"16px", fontWeight:800, color:"#fff", marginBottom:"4px" }}>GSC — Gestão de Serviços Consultores</div>
          <div style={{ fontSize:"12px", color:"#454560" }}>Desenvolvido por Marcelo Alexandre · Todos os direitos reservados · © 2026</div>
        </div>
      </div>
    ),
  };

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      {/* Sidebar do manual */}
      <div style={{ width:"200px", flexShrink:0, background:"#0d0d16", borderRight:"1px solid #1e1e2e", display:"flex", flexDirection:"column", overflowY:"auto", padding:"16px 8px" }}>
        <div style={{ fontSize:"9px", color:"#454560", fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase", padding:"0 8px 10px" }}>Conteúdo</div>
        {SECOES.map(sec=>(
          <button key={sec.id} onClick={()=>setSecaoAtiva(sec.id)}
            style={{ display:"flex", alignItems:"center", gap:"8px", padding:"8px 10px", borderRadius:"9px", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:"12px", fontWeight:secaoAtiva===sec.id?700:500, textAlign:"left", marginBottom:"2px", background:secaoAtiva===sec.id?"#7c6ff720":"transparent", color:secaoAtiva===sec.id?"#a78bfa":"#6e6e88", transition:"all .15s" }}>
            <span style={{ fontSize:"14px", flexShrink:0, width:"18px", textAlign:"center" }}>{sec.icon}</span>
            {sec.label}
          </button>
        ))}
        <div style={{ marginTop:"auto", padding:"12px 8px 4px", borderTop:"1px solid #1e1e2e" }}>
          <div style={{ fontSize:"10px", color:"#454560", lineHeight:1.6 }}>
            © 2026 · Marcelo Alexandre<br/>Todos os direitos reservados
          </div>
        </div>
      </div>

      {/* Conteúdo do manual */}
      <div style={{ flex:1, overflowY:"auto", padding:"32px 40px" }}>
        {CONTEUDO[secaoAtiva] || null}
      </div>
    </div>
  );
}

export default function ConsultorDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Verificar sessão salva ao carregar (opção 5 — lembrar login)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.email);
        if (profile) setCurrentUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...profile });
      }
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  if (!authChecked) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#0d0d14", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"20px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet"/>
      <div style={{ fontSize:"48px" }}>📅</div>
      <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:"20px", fontWeight:700, color:"#f0f0fa" }}>Agenda de Consultores</div>
      <div style={{ display:"flex", alignItems:"center", gap:"12px", color:"#6e6e88", fontSize:"14px" }}>
        <div style={{ width:"20px", height:"20px", border:"3px solid #2a2a3a", borderTop:"3px solid #3b82f6", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
        Verificando sessão...
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;
  return <Dashboard currentUser={currentUser} onLogout={async ()=>{ await signOut(auth); setCurrentUser(null); }} />;
}


// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD (wrapped — receives auth user)
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard({ currentUser, onLogout }) {
  const role = currentUser.role || "viewer";
  const isAdmin    = role === "admin";
  const isEditor   = role === "editor";
  const isViewer   = role === "viewer";
  const isConsultor= role === "consultor";
  // Perfis de gestão (podem aprovar viagens, ver OS, etc)
  const ROLES_GESTORES = ["admin","editor","diretor_executivo","diretor","gerente_executivo","gerente","coordenador"];
  const isGestor   = ROLES_GESTORES.includes(role);
  const canEdit    = isAdmin || isEditor;        // pode editar agenda
  const canManage  = isAdmin;                    // acessa Cadastros
  const canApprove = isGestor;                   // pode aprovar solicitações
  const [scheduleData, setScheduleData] = useState(SCHEDULE_DATA);
  const [clientList, setClientList] = useState(INITIAL_CLIENTS.map(n=>({ name:n, color:CLIENT_COLORS[n]||CLIENT_COLORS.default })));
  const [projects, setProjects] = useState([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [selectedConsultor, setSelectedConsultor] = useState(isConsultor ? currentUser.consultorName : null);
  const [selectedMonth, setSelectedMonth] = useState("Todos");
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0); // semanas a partir da semana atual
  const [searchClient, setSearchClient] = useState("");
  const [view, setView] = useState("calendario");
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [scheduleVersion, setScheduleVersion] = useState(0);
  const [osEntry, setOsEntry] = useState(null); // entrada selecionada para OS
  const [toast, setToast] = useState(null);
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [activeModule, setActiveModule] = useState(isConsultor ? "agenda" : "home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viaCount, setViaCount] = useState(0); // contador de solicitações de viagem
  const [projCount, setProjCount] = useState(0); // contador de projetos
  const [usuarios, setUsuarios] = useState([]);
  const [emailConfig, setEmailConfig] = useState(EMAIL_CONFIG_DEFAULT);
  const [consultorViewMode, setConsultorViewMode] = useState("mensal");

  const isDark = theme === "dark";
  const T = {
    bg:              isDark ? "#09090f"   : "#f5f5f7",
    surface:         isDark ? "#111118"   : "#ffffff",
    surface2:        isDark ? "#0d0d14"   : "#fafafa",
    surfaceHover:    isDark ? "#18181f"   : "#f0f0f5",
    border:          isDark ? "#1f1f2e"   : "#e4e4ea",
    border2:         isDark ? "#2a2a3a"   : "#d0d0da",
    text:            isDark ? "#c8c8d8"   : "#222233",
    text2:           isDark ? "#6e6e88"   : "#666677",
    text3:           isDark ? "#3e3e55"   : "#aaaabc",
    heading:         isDark ? "#f0f0fa"   : "#09090f",
    accent:          "#6c63ff",
    accentAlt:       "#a78bfa",
    accentHover:     "#5a52ee",
    accentGlow:      isDark ? "0 0 28px #6c63ff44" : "0 4px 16px #6c63ff33",
    success:         "#22d3a0",
    warning:         "#f5a623",
    danger:          "#f04f5e",
    headerBg:        isDark ? "#0c0c14"   : "#ffffff",
    headerBorder:    isDark ? "#1a1a28"   : "#e0e0ea",
    btnInactive:     isDark ? "#111118"   : "#f0f0f5",
    btnInactiveText: isDark ? "#6e6e88"   : "#555566",
    filterBg:        isDark ? "#111118"   : "#ffffff",
    inputBg:         isDark ? "#0d0d14"   : "#fafafa",
    inputBorder:     isDark ? "#2a2a3a"   : "#d0d0da",
    inputColor:      isDark ? "#c8c8d8"   : "#222233",
    cardBg:          isDark ? "#111118"   : "#ffffff",
    cardBorder:      isDark ? "#1f1f2e"   : "#e4e4ea",
    shadow:          isDark ? "0 2px 16px rgba(0,0,0,0.6)" : "0 2px 16px rgba(0,0,0,0.07)",
    shadowLg:        isDark ? "0 8px 48px rgba(0,0,0,0.8)" : "0 8px 48px rgba(0,0,0,0.12)",
  };

  // ── Carregar dados do Firestore na inicialização ──
  useEffect(() => {
    async function loadData() {
      // Carregar cada consultor individualmente (schedule_Nome) para evitar limite 1MB
      // Fallback: tenta o documento legado "scheduleData" se os individuais não existirem
      let sd = null;
      const consultoresDefault = Object.keys(SCHEDULE_DATA);
      const porConsultor = await Promise.all(
        consultoresDefault.map(nome =>
          loadFromFirestore("schedule_" + nome, null).then(v => ({ nome, v }))
        )
      );
      const algumCarregado = porConsultor.some(({ v }) => v !== null);
      if (algumCarregado) {
        sd = {};
        porConsultor.forEach(({ nome, v }) => { if (v !== null) sd[nome] = v; });
        // Verificar se há consultores extras no Firestore além dos do SCHEDULE_DATA
        // (consultores adicionados depois do deploy)
        try {
          const legadoSnap = await loadFromFirestore("scheduleData", null);
          if (legadoSnap) {
            Object.keys(legadoSnap).forEach(nome => {
              if (!sd[nome]) sd[nome] = legadoSnap[nome];
            });
          }
        } catch(e) {}
      } else {
        // Primeira vez — usa o documento legado ou o SCHEDULE_DATA padrão
        sd = await loadFromFirestore("scheduleData", SCHEDULE_DATA);
      }
      const [cl, pj] = await Promise.all([
        loadFromFirestore("clientList", INITIAL_CLIENTS.map(n=>({ name:n, color:CLIENT_COLORS[n]||CLIENT_COLORS.default }))),
        loadFromFirestore("projects", []),
      ]);
      setScheduleData(ensureIds(sd));
      setClientList(cl);
      setProjects(pj);
      // Carregar metadados de consultores (código, email)
      const cm = await loadFromFirestore("consultores_meta", []);
      window.__consultoresMeta = cm || [];
      // Carregar usuários para notificações de e-mail
      try {
        const uSnap = await getDocs(collection(db, "usuarios"));
        setUsuarios(uSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e) {}
      // Carregar configuração de e-mail
      const ec = await loadFromFirestore("emailConfig", EMAIL_CONFIG_DEFAULT);
      setEmailConfig(ec);
      // Carregar count de viagens para o dashboard home
      try {
        const snapV = await getDoc(doc(db,"app_data","viagens_all"));
        if (snapV.exists()) setViaCount((snapV.data().value||[]).length);
      } catch(e) {}
      // Carregar count de projetos para o dashboard home
      try {
        const snapPj = await getDoc(doc(db,"app_data","projetos_mgmt"));
        if (snapPj.exists()) setProjCount((snapPj.data().value||[]).length);
      } catch(e) {}
      setDbLoaded(true);
    }
    loadData();
  }, []);

  // ── Salvar clientList no Firestore quando mudar ──
  useEffect(() => {
    if (!dbLoaded) return;
    saveToFirestore("clientList", clientList);
  }, [clientList, dbLoaded]);

  // ── Salvar projects no Firestore quando mudar ──
  useEffect(() => {
    if (!dbLoaded) return;
    saveToFirestore("projects", projects);
  }, [projects, dbLoaded]);

  // ── Recarregar dados do consultor logado ao trocar de módulo (garante dados frescos do Firestore) ──
  useEffect(() => {
    if (!dbLoaded || !isConsultor || !currentUser.consultorName) return;
    const nome = currentUser.consultorName;
    getDoc(doc(db, "app_data", "schedule_" + nome)).then(snap => {
      if (!snap.exists()) return;
      const entradas = snap.data().value || [];
      setScheduleData(prev => {
        const atual = JSON.stringify(prev[nome] || []);
        const novo  = JSON.stringify(entradas);
        if (atual === novo) return prev;
        setScheduleVersion(v => v + 1);
        return { ...prev, [nome]: entradas };
      });
    }).catch(() => {});
  }, [activeModule, dbLoaded]);


  const consultores = Object.keys(scheduleData).sort((a,b)=>a.localeCompare(b,"pt-BR"));
  const clientColorMap = useMemo(()=>{ const m={}; clientList.forEach(c=>{ m[c.name]=c.color; }); return m; },[clientList]);

  const showToast = (msg,color) => { setToast({msg,color:color||"#22c55e"}); setTimeout(()=>setToast(null),3000); };

  // ── Salvar dados de OS (preserva todos os campos da entrada + campos OS) ──
  const handleSaveOS = async (updatedEntry) => {
    const consultor = updatedEntry.consultor || currentUser.consultorName;
    if (!consultor) { showToast("❌ Consultor não identificado", "#ef4444"); return; }

    // 1. Pegar lista atual do estado React
    const listaAtual = scheduleData[consultor] || [];

    // 2. Verificar se já existe outra OS com mesmo horário no mesmo dia (exceto a própria entrada)
    const horaIni = updatedEntry.horaInicio;
    const duplicada = listaAtual.find(e =>
      e.id !== updatedEntry.id &&
      e.osNumero &&
      e.day === updatedEntry.day &&
      e.month === updatedEntry.month &&
      (e.year || "") === (updatedEntry.year || "") &&
      horaIni && e.horaInicio === horaIni
    );
    if (duplicada) {
      showToast(`⚠️ Já existe a OS ${duplicada.osNumero} neste horário (${horaIni})`, "#f5a623");
      return;
    }

    const idx = listaAtual.findIndex(e => e.id === updatedEntry.id);
    let novaLista;
    if (idx >= 0) {
      novaLista = listaAtual.map(e => e.id === updatedEntry.id ? { ...e, ...updatedEntry } : e);
    } else {
      novaLista = [...listaAtual, { ...updatedEntry, consultor }];
    }

    // 3. Salvar direto no Firestore
    try {
      await setDoc(doc(db, "app_data", "schedule_" + consultor), { value: novaLista });
    } catch(e) {
      console.error("Erro Firestore:", e);
      showToast("❌ Erro ao salvar no servidor", "#ef4444");
      return;
    }

    // 4. Atualizar estado React e forçar re-render do calendário
    setScheduleData(prev => ({ ...prev, [consultor]: novaLista }));
    setScheduleVersion(v => v + 1);
    showToast("✅ OS salva com sucesso!");
  };

  const handleSaveEntry = (entry) => {
    const {id, consultor, month, year, days, client, type, modalidade, horaInicio, horaFim, intervalo, atividades, notifyEmail} = entry;
    const agora = new Date().toISOString();
    const nomeUsuario = currentUser.nome || currentUser.email;

    // Capturar criadoPor antes de atualizar o estado (para notificação de alteração)
    let criadoPorOriginal = nomeUsuario;
    if (id) {
      const existing = (scheduleData[consultor]||[]).find(e => e.id === id);
      criadoPorOriginal = existing?.criadoPor || nomeUsuario;
    }

    // Calcular nova lista primeiro
    let list = [...(scheduleData[consultor]||[])];
    days.forEach(day=>{
      if (id) {
        const idx = list.findIndex(e=>e.id===id);
        if (idx>=0) {
          const old = list[idx];
          const alteracoes = [];
          if (old.client !== client) alteracoes.push({campo:"cliente", de:old.client||"-", para:client});
          if (old.type !== type) alteracoes.push({campo:"tipo", de:old.type||"-", para:type});
          if (old.horaInicio !== horaInicio) alteracoes.push({campo:"início", de:old.horaInicio||"-", para:horaInicio});
          if (old.horaFim !== horaFim) alteracoes.push({campo:"fim", de:old.horaFim||"-", para:horaFim});
          if ((old.intervalo||"") !== (intervalo||"")) alteracoes.push({campo:"intervalo", de:old.intervalo||"-", para:intervalo||"-"});
          if ((old.atividades||'') !== (atividades||'')) alteracoes.push({campo:'atividades', de:old.atividades||'-', para:atividades||'-'});
          const hist = [...(old.historico||[{acao:"criado",por:old.criadoPor||"?",em:old.criadoEm||agora}]), {acao:"alterado",por:nomeUsuario,em:agora,alteracoes}];
          list[idx]={...old,client,type,modalidade,horaInicio,horaFim,intervalo,atividades,alteradoPor:nomeUsuario,alteradoEm:agora,historico:hist};
        }
      } else {
        const newId = genId();
        list.push({id:newId,month,year,day,weekday:"-",client,type,modalidade,horaInicio,horaFim,intervalo,atividades,criadoPor:nomeUsuario,criadoEm:agora,historico:[{acao:"criado",por:nomeUsuario,em:agora}]});
      }
    });
    list.sort((a,b)=>{
      const mi=MONTHS_ORDER.findIndex(m=>m.toUpperCase()===a.month.toUpperCase());
      const mj=MONTHS_ORDER.findIndex(m=>m.toUpperCase()===b.month.toUpperCase());
      if (mi!==mj) return mi-mj;
      if (a.day!==b.day) return a.day-b.day;
      return (a.horaInicio||"00:00").localeCompare(b.horaInicio||"00:00");
    });

    // Salvar no Firestore explicitamente
    saveToFirestore("schedule_" + consultor, list);

    // Atualizar estado React
    setScheduleData(prev=>({ ...prev, [consultor]: list }));
    showToast("✅ "+(id?"Entrada atualizada":""+days.length+" dia(s) salvo(s)")+" para "+consultor.split(" ")[0]);
    setShowModal(false); setEditEntry(null);
    setScheduleVersion(v => v + 1);

    // Enviar notificação por e-mail se solicitado
    if (notifyEmail) {
      sendAgendaEmail({
        action:      id ? 'alterada' : 'nova',
        consultor, client, month, year, days,
        horaInicio, horaFim, intervalo, atividades, modalidade,
        criadoPor:   criadoPorOriginal,
        nomeUsuario,
      });
    }
  };

  const handleDeleteEntry = (consultor, entryId) => {
    setScheduleData(prev=>{ const u={...prev}; u[consultor]=(u[consultor]||[]).filter(e=>e.id!==entryId); return u; });
    showToast("🗑 Entrada removida","#ef4444");
    setScheduleVersion(v => v + 1);
  };

  // Cadastros handlers
  const handleSaveEmailConfig = (cfg) => {
    setEmailConfig(cfg);
    saveToFirestore("emailConfig", cfg);
    showToast("✅ Configuração de e-mail salva!", "#22c55e");
  };

  const handleAddConsultor = (consultor) => {
    if (scheduleData[consultor.name]) { showToast("Consultor já existe","#ef4444"); return; }
    setScheduleData(prev=>({...prev,[consultor.name]:[]}));
    window.__consultoresMeta = [...(window.__consultoresMeta||[]).filter(c=>c.name!==consultor.name), consultor];
    saveToFirestore("consultores_meta", window.__consultoresMeta);
    showToast("👤 Consultor "+consultor.name+" cadastrado!");
  };
  const handleRemoveConsultor = (name) => {
    setScheduleData(prev=>{ const u={...prev}; delete u[name]; return u; });
    window.__consultoresMeta = (window.__consultoresMeta||[]).filter(c=>c.name!==name);
    saveToFirestore("consultores_meta", window.__consultoresMeta);
    // Remover documento individual do Firestore
    deleteDoc(doc(db, "app_data", "schedule_" + name)).catch(()=>{});
    showToast("🗑 Consultor removido","#ef4444");
  };
  const handleUpdateConsultor = (oldName, updated) => {
    // atualiza metadados
    window.__consultoresMeta = [...(window.__consultoresMeta||[]).filter(c=>c.name!==oldName), updated];
    saveToFirestore("consultores_meta", window.__consultoresMeta);
    // se o nome mudou, renomear no scheduleData
    if (oldName !== updated.name) {
      setScheduleData(prev=>{ const u={...prev}; u[updated.name]=u[oldName]||[]; delete u[oldName]; return u; });
    }
    showToast("✅ Consultor atualizado!");
  };
  const handleAddClient = (client) => {
    if (clientList.find(c=>c.name===client.name)) { showToast("Cliente já existe","#ef4444"); return; }
    setClientList(prev=>[...prev,client]);
    showToast("🏢 Cliente "+client.name+" cadastrado!");
  };
  const handleRemoveClient = (name) => { setClientList(prev=>prev.filter(c=>c.name!==name)); showToast("🗑 Cliente removido","#ef4444"); };
  const handleUpdateClient = (oldName, updated) => {
    setClientList(prev=>prev.map(c=>c.name===oldName?{...c,...updated}:c));
    showToast("✅ Cliente atualizado!");
  };
  const handleAddProject = (project) => { setProjects(prev=>[...prev,project]); showToast("📋 Projeto "+project.name+" cadastrado!"); };
  const handleRemoveProject = (idx) => { setProjects(prev=>prev.filter((_,i)=>i!==idx)); showToast("🗑 Projeto removido","#ef4444"); };
  const handleUpdateProject = (idx, updated) => {
    setProjects(prev=>prev.map((p,i)=>i===idx?{...p,...updated}:p));
    showToast("✅ Projeto atualizado!");
  };

  // ── Enviar notificação por e-mail (EmailJS) ──
  const sendAgendaEmail = async ({ action, consultor, client, month, year, days, horaInicio, horaFim, intervalo, atividades, modalidade, criadoPor, nomeUsuario }) => {
    const cfg = emailConfig;
    if (!cfg.enabled) {
      showToast("⚠️ Envio de e-mail está desativado. Configure em Cadastros → E-mail","#f59e0b");
      return;
    }
    if (!cfg.publicKey || !cfg.serviceId || !cfg.templateId) {
      showToast("⚠️ Configure as credenciais do e-mail em Cadastros → E-mail","#f59e0b");
      return;
    }

    // Carregar EmailJS do CDN se ainda não estiver
    const loadEJ = () => new Promise((resolve, reject) => {
      if (window.emailjs) { window.emailjs.init({ publicKey: cfg.publicKey }); resolve(window.emailjs); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      s.onload = () => { window.emailjs.init({ publicKey: cfg.publicKey }); resolve(window.emailjs); };
      s.onerror = reject;
      document.head.appendChild(s);
    });

    // Encontrar usuário pelo nome do consultor, nome ou e-mail
    const findUser = (nameOrEmail) => {
      if (!nameOrEmail) return null;
      return usuarios.find(u =>
        u.consultorName === nameOrEmail || u.nome === nameOrEmail || u.email === nameOrEmail
      ) || null;
    };

    const mesAno = `${month} ${year}`;
    const diasStr = (days||[]).join(', ');
    const acao = action === 'nova' ? 'incluída' : 'alterada';
    const horarioTexto = [
      horaInicio, horaFim ? `→ ${horaFim}` : '', intervalo ? `(intervalo: ${intervalo}min)` : ''
    ].filter(Boolean).join(' ') || '—';

    // ── Compor assunto: "Agenda incluída: Dia 17 — VEDACIT (Março 2026)"
    const diaLabel = days && days.length === 1 ? `Dia ${days[0]}` : `Dias ${diasStr}`;
    const assunto = `Agenda ${acao}: ${diaLabel} — ${consultor.split(" ")[0]} | ${client || '—'} (${mesAno})`;

    // ── Gerar links de calendário (Google Calendar + ICS)
    const monthIdx = MONTHS_ORDER.indexOf(month);
    const gerarLinksCalendario = () => {
      if (!days || days.length === 0 || monthIdx === -1) return '';
      const links = days.map(dia => {
        const dataBase = new Date(year, monthIdx, dia);
        // Hora início / fim para o evento
        const [hi, mi] = (horaInicio||'08:00').split(':').map(Number);
        const [hf, mf] = (horaFim||'17:00').split(':').map(Number);
        const dtStart = new Date(year, monthIdx, dia, hi, mi);
        const dtEnd   = new Date(year, monthIdx, dia, hf, mf);
        const pad = n => String(n).padStart(2,'0');
        const fmtDt = d => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
        const titulo = encodeURIComponent(`${client||'—'} — GSC`);
        const loc    = encodeURIComponent(modalidade === 'remoto' ? 'Remoto (online)' : 'Presencial');
        const det    = encodeURIComponent(`Consultor: ${consultor}\nCliente: ${client||'—'}\nModalidade: ${modalidade==='remoto'?'Remoto':'Presencial'}\n${atividades?'Atividades: '+atividades:''}`);
        // Google Calendar link
        const gcUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${fmtDt(dtStart)}/${fmtDt(dtEnd)}&details=${det}&location=${loc}`;
        // ICS content como data URI
        const icsContent = [
          'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//GSC//Agenda//PT',
          'BEGIN:VEVENT',
          `DTSTART:${fmtDt(dtStart)}`,
          `DTEND:${fmtDt(dtEnd)}`,
          `SUMMARY:${(client||'—')} — GSC`,
          `DESCRIPTION:Consultor: ${consultor}\\nCliente: ${client||'—'}\\nModalidade: ${modalidade==='remoto'?'Remoto':'Presencial'}`,
          `LOCATION:${modalidade==='remoto'?'Remoto (online)':'Presencial'}`,
          'END:VEVENT','END:VCALENDAR'
        ].join('\r\n');
        const icsUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
        const diaLabel2 = `${pad(dia)}/${pad(monthIdx+1)}/${year}`;
        return `
          <div style="margin-bottom:12px">
            <div style="margin-bottom:6px">
              <span style="font-size:13px;color:#374151;font-weight:600;margin-right:10px">📆 ${diaLabel2}</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
              <a href="${gcUrl}" target="_blank" style="display:inline-block;padding:5px 12px;background:#4285F4;color:#fff;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none">📅 Google Agenda</a>
              <a href="${icsUri}" download="agenda_gsc_${dia}_${monthIdx+1}_${year}.ics" style="display:inline-block;padding:5px 12px;background:#6c63ff;color:#fff;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none">📥 Outlook / Apple (.ics)</a>
            </div>
          </div>`;
      }).join('');
      return `
        <div style="margin-top:16px;padding:14px 16px;background:#f0f7ff;border-radius:8px;border:1px solid #bfdbfe">
          <div style="font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">📅 Adicionar ao Calendário</div>
          ${links}
          <p style="margin:10px 0 0;font-size:11px;color:#6b7280"><strong>Google Agenda</strong> → abre direto no Google Calendar pré-preenchido. <strong>Outlook / Apple (.ics)</strong> → baixa arquivo para importar no Outlook, Apple Calendar ou qualquer app de calendário.</p>
        </div>`;
    };

    // ── Compor corpo HTML
    const rows = [
      ["Consultor", consultor],
      ["Cliente",   client || '—'],
      ["Data",      `${diaLabel} de ${mesAno}`],
      ["Modalidade", modalidade === "remoto" ? "💻 Remoto" : "🏢 Presencial"],
      ["Horário",   horarioTexto],
      ...(atividades ? [["Atividades", atividades.replace(/\n/g,'<br>')]] : []),
      ["Agendado por", nomeUsuario],
    ];
    const tbody = rows.map(([k,v],i) =>
      `<tr style="background:${i%2===0?'#f0f0fa':'#ffffff'}"><td style="padding:10px 14px;font-weight:600;color:#6e6e88;width:130px;border-right:1px solid #c8c8d8">${k}</td><td style="padding:10px 14px;color:#18181f">${v}</td></tr>`
    ).join('');
    const corpo = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #c8c8d8;border-radius:10px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#1e3a5f,#0d0d14);padding:20px 24px">
    <h2 style="color:#f0f0fa;margin:0;font-size:18px">📅 Agenda de Consultores</h2>
    <p style="color:#6e6e88;margin:4px 0 0;font-size:13px">Notificação automática — agenda <strong style="color:#60a5fa">${acao}</strong></p>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:14px">${tbody}</table>
  <div style="padding:14px 24px;background:#fff">${gerarLinksCalendario()}</div>
  <div style="padding:14px 24px;background:#f0f0fa;border-top:1px solid #c8c8d8">
    <p style="margin:0;font-size:11px;color:#6e6e88">Esta mensagem foi enviada automaticamente pelo sistema Agenda de Consultores.</p>
  </div>
</div>`.trim();

    // ── Montar destinatários
    const addRecipient = (emailOrUser, nameHint) => {
      if (!emailOrUser) return;
      const email = typeof emailOrUser === 'string' ? emailOrUser : emailOrUser.email;
      const name  = typeof emailOrUser === 'string' ? (nameHint || emailOrUser) : (emailOrUser.nome || emailOrUser.name || emailOrUser.email);
      if (email && !recipients.find(r => r.email === email))
        recipients.push({ email, name: name || email });
    };
    const recipients = [];
    if (action === 'nova') {
      // Nova entrada: notifica o consultor + quem criou (currentUser)
      const cons = findUser(consultor);
      addRecipient(cons);
      addRecipient(currentUser.email, currentUser.nome || currentUser.email);
    } else {
      // Alteração: notifica o consultor + quem criou a entrada original + quem alterou (currentUser)
      const cons = findUser(consultor);
      addRecipient(cons);
      // Quem criou originalmente (editor/coordenador que incluiu a agenda)
      if (criadoPor) {
        const orig = findUser(criadoPor);
        addRecipient(orig || criadoPor);
      }
      // Quem fez a alteração (pode ser diferente de quem criou)
      addRecipient(currentUser.email, currentUser.nome || currentUser.email);
    }

    if (recipients.length === 0) {
      showToast("⚠️ Nenhum e-mail encontrado para notificar. Verifique o cadastro de usuários.","#f59e0b");
      return;
    }

    try {
      const ej = await loadEJ();
      for (const r of recipients) {
        await ej.send(cfg.serviceId, cfg.templateId, { assunto, corpo, to_name: r.name, to_email: r.email, from_name: cfg.fromName||"GSC - Gestão Serviço Consultor", acao, consultor, cliente: client||'—', mes_ano: mesAno, dias: diasStr, horario: horarioTexto, modalidade: modalidade === 'remoto' ? '💻 Remoto' : '🏢 Presencial', atividades: atividades||'—', realizado_por: nomeUsuario });
      }
      showToast(`📧 E-mail enviado para ${recipients.length} destinatário(s)`, "#3b82f6");
    } catch(e) {
      console.error("EmailJS error:", e);
      showToast("❌ Falha ao enviar e-mail: " + (e?.text || e?.message || "erro desconhecido"), "#ef4444");
    }
  };

  // ── Inserir feriados nacionais em todos os consultores ──
  const handleInserirFeriados = async () => {
    const ano = new Date().getFullYear();
    const anos = [ano, ano + 1];
    const anoEscolhido = window.confirm(
      `Inserir feriados nacionais de ${ano} e ${ano+1} na agenda de todos os consultores?\n\nFeriados já existentes não serão duplicados.`
    );
    if (!anoEscolhido) return;

    let totalInseridos = 0;
    const novoSchedule = { ...scheduleData };

    for (const consultorNome of consultores) {
      const entradas = [...(novoSchedule[consultorNome] || [])];

      for (const a of anos) {
        const feriados = getFeriadosBrasil(a);
        for (const f of feriados) {
          const mesNome = MONTHS_ORDER[f.mes - 1];
          // Verificar se já existe feriado nesse dia/mês/ano
          const jaExiste = entradas.some(e =>
            e.day === f.dia &&
            e.month.toUpperCase() === mesNome.toUpperCase() &&
            (e.year === a || !e.year) &&
            e.type === "holiday"
          );
          if (!jaExiste) {
            entradas.push({
              id: `fer_${a}_${f.mes}_${f.dia}_${consultorNome.replace(/\s/g,'_')}`,
              month: mesNome,
              year: a,
              day: f.dia,
              weekday: ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][new Date(a, f.mes-1, f.dia).getDay()],
              client: f.nome,
              type: "holiday",
              modalidade: "presencial",
              horaInicio: "", horaFim: "", intervalo: "", atividades: "",
            });
            totalInseridos++;
          }
        }
      }

      // Ordenar por mês e dia
      entradas.sort((a, b) => {
        const ma = MONTHS_ORDER.findIndex(m => m.toUpperCase() === (a.month||"").toUpperCase());
        const mb = MONTHS_ORDER.findIndex(m => m.toUpperCase() === (b.month||"").toUpperCase());
        const ya = a.year || 2025, yb = b.year || 2025;
        if (ya !== yb) return ya - yb;
        if (ma !== mb) return ma - mb;
        return (a.day||0) - (b.day||0);
      });

      novoSchedule[consultorNome] = entradas;

      // Salvar no Firestore
      try {
        await setDoc(doc(db, "app_data", "schedule_" + consultorNome), { value: entradas });
      } catch(e) { console.warn("Erro ao salvar feriados de", consultorNome, e); }
    }

    setScheduleData(novoSchedule);
    showToast(
      totalInseridos > 0
        ? `🎉 ${totalInseridos} feriado(s) inserido(s) em ${consultores.length} consultor(es)`
        : `✅ Feriados já estavam atualizados`,
      "#22d3a0"
    );
  };

  // ── Exportar para Excel ──
  const handleExportExcel = () => {
    const loadXLSX = () => new Promise(resolve => {
      if (window.XLSX) { resolve(window.XLSX); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = () => resolve(window.XLSX);
      document.head.appendChild(s);
    });

    const TYPE_PT = { client:"Cliente", vacation:"Férias", holiday:"Feriado", reserved:"Reservado", blocked:"Bloqueado" };
    const fmtDate = v => v ? new Date(v).toLocaleString('pt-BR') : '';

    loadXLSX().then(XLSX => {
      // Build flat rows
      const rows = [];
      for (const [consultor, entries] of Object.entries(scheduleData)) {
        for (const e of (entries||[])) {
          rows.push({
            Consultor: consultor,
            Mês: e.month || '',
            Ano: e.year || '',
            Dia: e.day || '',
            Cliente: e.client || '',
            Tipo: TYPE_PT[e.type] || e.type || '',
            'Hora Início': e.horaInicio || '',
            'Hora Fim': e.horaFim || '',
            'Intervalo (min)': e.intervalo || '',
            Atividades: e.atividades || '',
            'Criado Por': e.criadoPor || '',
            'Criado Em': fmtDate(e.criadoEm),
            'Alterado Por': e.alteradoPor || '',
            'Alterado Em': fmtDate(e.alteradoEm),
          });
        }
      }

      const sortRows = (a, b, primaryKey) => {
        if (a[primaryKey] !== b[primaryKey]) return a[primaryKey].localeCompare(b[primaryKey]);
        const ma = MONTHS_ORDER.indexOf(a.Mês), mb = MONTHS_ORDER.indexOf(b.Mês);
        if (ma !== mb) return ma - mb;
        if ((a.Ano||0) !== (b.Ano||0)) return (a.Ano||0) - (b.Ano||0);
        return (a.Dia||0) - (b.Dia||0);
      };

      const byConsultor = [...rows].sort((a,b)=>sortRows(a,b,'Consultor'));
      const byCliente   = [...rows].sort((a,b)=>sortRows(a,b,'Cliente'));

      // Resumo: consultor × cliente → count
      const resumoMap = {};
      rows.forEach(r => {
        if (!resumoMap[r.Consultor]) resumoMap[r.Consultor] = {};
        resumoMap[r.Consultor][r.Cliente] = (resumoMap[r.Consultor][r.Cliente]||0) + 1;
      });
      const allClients = [...new Set(rows.map(r=>r.Cliente))].sort();
      const resumoRows = Object.entries(resumoMap).sort(([a],[b])=>a.localeCompare(b)).map(([cons,clients])=>{
        const row = { Consultor: cons };
        allClients.forEach(c => { row[c] = clients[c] || 0; });
        row['Total'] = Object.values(clients).reduce((s,v)=>s+v,0);
        return row;
      });

      const wb = XLSX.utils.book_new();

      const makeSheet = (data) => {
        const ws = XLSX.utils.json_to_sheet(data);
        // Auto column widths
        const cols = Object.keys(data[0]||{});
        ws['!cols'] = cols.map(k => ({
          wch: Math.max(k.length, ...data.map(r=>String(r[k]||'').length), 10)
        }));
        // Freeze header row
        ws['!freeze'] = { xSplit:0, ySplit:1 };
        return ws;
      };

      XLSX.utils.book_append_sheet(wb, makeSheet(byConsultor), 'Por Consultor');
      XLSX.utils.book_append_sheet(wb, makeSheet(byCliente),   'Por Cliente');
      if (resumoRows.length > 0)
        XLSX.utils.book_append_sheet(wb, makeSheet(resumoRows), 'Resumo');

      const date = new Date().toISOString().slice(0,10);
      XLSX.writeFile(wb, `Agenda_Consultores_${date}.xlsx`);
      showToast('📊 Planilha exportada!', '#22c55e');
    }).catch(()=>showToast('Erro ao exportar planilha','#ef4444'));
  };

  const allMonths = useMemo(()=>["Todos",...MONTHS_ORDER],[]);

  const filteredData = useMemo(()=>{
    const src=selectedConsultor?{[selectedConsultor]:scheduleData[selectedConsultor]}:scheduleData;
    const result={};
    for (const [name,entries] of Object.entries(src)) {
      result[name]=(entries||[]).filter(e=>{
        const mo=selectedMonth==="Todos"||e.month.toUpperCase()===selectedMonth.toUpperCase();
        const co=!searchClient||e.client.toUpperCase().includes(searchClient.toUpperCase());
        return mo&&co;
      });
    }
    return result;
  },[selectedConsultor,selectedMonth,searchClient,scheduleData]);

  const stats = useMemo(()=>{
    const allEntries=Object.values(filteredData).flat();
    const clientDays={};
    allEntries.forEach(e=>{ if(e.type==="client"){ const n=normalizeClient(e.client); clientDays[n]=(clientDays[n]||0)+1; }});
    const topClients=Object.entries(clientDays).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const consultorStats=Object.entries(filteredData).map(([name,entries])=>({ name, working:entries.filter(e=>e.type==="client").length, vacation:entries.filter(e=>e.type==="vacation").length, reserved:entries.filter(e=>e.type==="reserved").length })).sort((a,b)=>b.working-a.working);
    return {topClients,consultorStats};
  },[filteredData]);

  const calendarData = useMemo(()=>{
    if (!selectedConsultor||selectedMonth==="Todos") return null;
    const entries=filteredData[selectedConsultor]||[];
    const byDay={};
    entries.forEach(e=>{
      if (!byDay[e.day]) byDay[e.day]=[];
      byDay[e.day].push(e);
    });
    return byDay;
  },[selectedConsultor,selectedMonth,filteredData]);

  // ── Dados da semana global (view semanal) ──
  const weeklyData = useMemo(()=>{
    const today = new Date();
    // Segunda-feira da semana atual + offset
    const dow = (today.getDay()+6)%7; // 0=seg
    const monday = new Date(today); monday.setDate(today.getDate() - dow + selectedWeekOffset*7);
    monday.setHours(0,0,0,0);
    const days = Array.from({length:7},(_,i)=>{ const d=new Date(monday); d.setDate(monday.getDate()+i); return d; });
    const WD = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
    const result = { days, consultores: [] };
    const consultoresList = isConsultor ? [currentUser.consultorName] : consultores;
    for (const name of consultoresList) {
      const entries = (scheduleData[name]||[]);
      const row = { name, cells: days.map(d=>{
        const mName = MONTHS_ORDER[d.getMonth()];
        const dayNum = d.getDate();
        const yr = d.getFullYear();
        return entries.filter(e => {
          const em = e.month ? e.month.charAt(0).toUpperCase()+e.month.slice(1).toLowerCase() : "";
          const mn = mName.charAt(0).toUpperCase()+mName.slice(1).toLowerCase();
          return em===mn && e.day===dayNum && (e.year===yr || !e.year);
        });
      })};
      result.consultores.push(row);
    }
    return { ...result, monday };
  },[selectedWeekOffset, scheduleData, consultores, isConsultor, currentUser]);

  const VIEWS = canManage
    ? ["grid","calendario","semanal","timeline","stats","cadastros"]
    : ["grid","calendario","semanal","timeline","stats"];
  const VIEW_LABELS = { grid:"🗓 Grade", calendario:"📆 Calendário", semanal:"📅 Semanal", timeline:"📊 Timeline", stats:"📈 Stats", cadastros:"🗂 Cadastros", grade:"🎓 Grade de Conhecimento", "os-perfil":"📋 OS do Consultor" };

  const badge = ROLE_BADGES[currentUser.role];

  // Tela de carregamento enquanto busca dados do Firestore
  if (!dbLoaded) return (
    <div style={{ fontFamily:"'Outfit',sans-serif", background:"#09090f", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"20px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;800&family=Cabinet+Grotesk:wght@900&display=swap" rel="stylesheet"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div style={{ width:"54px",height:"54px",borderRadius:"16px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"26px",boxShadow:"0 0 40px #6c63ff55" }}>◈</div>
      <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:"20px", fontWeight:900, color:"#f0f0fa", letterSpacing:"-0.5px" }}>Agenda de Consultores</div>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", color:"#3e3e55", fontSize:"13px" }}>
        <div style={{ width:"16px", height:"16px", border:"2px solid #1f1f2e", borderTop:"2px solid #6c63ff", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
        Carregando dados...
      </div>
    </div>
  );

  // Todos os módulos disponíveis por perfil (fonte única de verdade)
  const ALL_MODULES_GESTOR = [
    { id:"home",     icon:"⬡",  label:"Dashboard",            desc:"Visão geral do sistema" },
    { id:"agenda",   icon:"📅", label:"Agenda",                desc:"Agenda de consultores" },
    { id:"os",       icon:"📋", label:"Ordens de Serviço",     desc:"Consulta e aprovação de OS" },
    { id:"viagens",  icon:"🏨", label:"Viagem e Hospedagem",   desc:"Solicitações de viagem e hospedagem" },
    { id:"traslado", icon:"🚗", label:"Traslado",              desc:"RDA e gestão de traslados" },
    { id:"projetos", icon:"📁", label:"Projetos",              desc:"Gestão de projetos" },
    { id:"grade",    icon:"🎓", label:"Grade de Conhecimento", desc:"Consultar grade dos consultores" },
    { id:"alcadas",  icon:"🔀", label:"Alçadas",               desc:"Hierarquia de aprovação" },
  ];
  const ALL_MODULES_CONSULTOR = [
    { id:"agenda",    icon:"📅", label:"Agenda",                desc:"Minha agenda" },
    { id:"minhas-os", icon:"📋", label:"Minhas OS",             desc:"Ordens de serviço" },
    { id:"grade",     icon:"🎓", label:"Grade de Conhecimento", desc:"Meus conhecimentos" },
    { id:"viagens",   icon:"🏨", label:"Viagem e Hospedagem",   desc:"Minhas solicitações" },
    { id:"traslado",  icon:"🚗", label:"Traslado",              desc:"RDA de traslado" },
    { id:"manual",    icon:"📖", label:"Manual",                desc:"Guia de uso do sistema" },
  ];
  const ALL_MODULES_BASICO = [
    { id:"home",     icon:"⬡",  label:"Dashboard",            desc:"Visão geral" },
    { id:"agenda",   icon:"📅", label:"Agenda",                desc:"Agenda" },
    { id:"viagens",  icon:"🏨", label:"Viagem e Hospedagem",   desc:"Solicitações" },
  ];

  const modulosHabilitados = currentUser.modulosHabilitados || null;

  const baseModules = isConsultor ? ALL_MODULES_CONSULTOR
    : isGestor ? ALL_MODULES_GESTOR
    : ALL_MODULES_BASICO;

  const MODULES_ADMIN    = ALL_MODULES_GESTOR.filter(m => !modulosHabilitados || modulosHabilitados.includes(m.id));
  const MODULES = isConsultor
    ? ALL_MODULES_CONSULTOR.filter(m =>
        m.id === "agenda" || m.id === "minhas-os" || // agenda e OS sempre visíveis para consultor
        !modulosHabilitados || modulosHabilitados.includes(m.id)
      )
    : baseModules.filter(m => !modulosHabilitados || modulosHabilitados.includes(m.id));

  const SIDEBAR_W     = sidebarCollapsed ? 60 : 220;
  const SIDEBAR_TRANS = "width .22s cubic-bezier(.4,0,.2,1)";

  return (
    <div style={{ fontFamily:"'Outfit',sans-serif",background:T.bg,minHeight:"100vh",color:T.text,display:"flex",flexDirection:"row" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Cabinet+Grotesk:wght@700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${T.border2};border-radius:99px;}
        ::-webkit-scrollbar-thumb:hover{background:${T.accent};}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .nav-btn{transition:all .2s cubic-bezier(.4,0,.2,1);position:relative;}
        .nav-btn:hover{color:${T.heading}!important;}
        .nav-btn.active{background:${T.accent}!important;color:#fff!important;box-shadow:${T.accentGlow};}
        .action-btn{transition:all .2s cubic-bezier(.4,0,.2,1);}
        .action-btn:hover{filter:brightness(1.1);transform:translateY(-1px);}
        .card-hover{transition:box-shadow .25s,transform .25s,border-color .25s;}
        .card-hover:hover{box-shadow:${T.shadowLg};transform:translateY(-3px);border-color:${T.accent}44!important;}
        .side-item{transition:all .18s cubic-bezier(.4,0,.2,1);cursor:pointer;border-radius:10px;}
        .side-item:hover{background:${T.surfaceHover}!important;}
        input,select,textarea{outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit;}
        input:focus,select:focus,textarea:focus{border-color:${T.accent}!important;box-shadow:0 0 0 3px ${T.accent}20!important;}
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{ width:SIDEBAR_W+"px",minHeight:"100vh",background:T.headerBg,borderRight:"1px solid "+T.headerBorder,display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,zIndex:100,flexShrink:0,transition:SIDEBAR_TRANS,overflow:"hidden" }}>
        {/* Logo + toggle */}
        <div style={{ padding:"14px 12px",borderBottom:"1px solid "+T.border,flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:"10px",minWidth:0 }}>
            <div style={{ width:"34px",height:"34px",borderRadius:"10px",background:`linear-gradient(135deg,${T.accent},${T.accentAlt})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",boxShadow:T.accentGlow,flexShrink:0 }}>◈</div>
            {!sidebarCollapsed && (
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"15px",fontWeight:900,color:T.heading,letterSpacing:"-0.5px",lineHeight:1 }}>GSC</div>
                <div style={{ fontSize:"9px",color:T.text3,fontWeight:600,letterSpacing:"1.5px",marginTop:"2px",textTransform:"uppercase" }}>Gestão de Serviços</div>
              </div>
            )}
            <button onClick={()=>setSidebarCollapsed(c=>!c)} title={sidebarCollapsed?"Expandir menu":"Recolher menu"}
              style={{ marginLeft:"auto",background:"transparent",border:"1px solid "+T.border,color:T.text3,borderRadius:"7px",width:"26px",height:"26px",cursor:"pointer",fontSize:"12px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s" }}>
              {sidebarCollapsed?"›":"‹"}
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1,padding:"10px 8px",display:"flex",flexDirection:"column",gap:"2px",overflowY:"auto",overflowX:"hidden" }}>
          {!sidebarCollapsed && <div style={{ fontSize:"9px",color:T.text3,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",padding:"8px 8px 6px" }}>Módulos</div>}
          {MODULES.map(m=>{
            const active = activeModule===m.id;
            return (
              <div key={m.id} className="side-item" onClick={()=>{ if (m.id!=="agenda") { setSelectedConsultor(isConsultor?currentUser.consultorName:null); setSelectedMonth("Todos"); } setActiveModule(m.id); }} title={sidebarCollapsed?m.label:""}
                style={{ padding:sidebarCollapsed?"10px":"10px 12px",display:"flex",alignItems:"center",gap:"10px",justifyContent:sidebarCollapsed?"center":"flex-start",background:active?`${T.accent}18`:"transparent",border:active?`1px solid ${T.accent}33`:"1px solid transparent",minWidth:0 }}>
                <span style={{ fontSize:"18px",lineHeight:1,flexShrink:0 }}>{m.icon}</span>
                {!sidebarCollapsed && (
                  <>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:"13px",fontWeight:active?700:500,color:active?T.accent:T.text,whiteSpace:"nowrap" }}>{m.label}</div>
                      <div style={{ fontSize:"10px",color:T.text3,marginTop:"1px",whiteSpace:"nowrap" }}>{m.desc}</div>
                    </div>
                    {active && <div style={{ marginLeft:"auto",width:"4px",height:"20px",borderRadius:"2px",background:T.accent,flexShrink:0 }}/>}
                  </>
                )}
              </div>
            );
          })}

          {canManage && (
            <>
              {!sidebarCollapsed && <div style={{ fontSize:"9px",color:T.text3,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",padding:"16px 8px 6px" }}>Administração</div>}
              {sidebarCollapsed && <div style={{ height:"10px" }}/>}
              <div className="side-item" onClick={()=>{ setSelectedConsultor(isConsultor?currentUser.consultorName:null); setSelectedMonth("Todos"); setActiveModule("cadastros"); }} title={sidebarCollapsed?"Cadastros":""}
                style={{ padding:sidebarCollapsed?"10px":"10px 12px",display:"flex",alignItems:"center",gap:"10px",justifyContent:sidebarCollapsed?"center":"flex-start",background:activeModule==="cadastros"?`${T.accent}18`:"transparent",border:activeModule==="cadastros"?`1px solid ${T.accent}33`:"1px solid transparent" }}>
                <span style={{ fontSize:"18px",lineHeight:1,flexShrink:0 }}>🗂</span>
                {!sidebarCollapsed && (
                  <>
                    <div>
                      <div style={{ fontSize:"13px",fontWeight:activeModule==="cadastros"?700:500,color:activeModule==="cadastros"?T.accent:T.text }}>Cadastros</div>
                      <div style={{ fontSize:"10px",color:T.text3,marginTop:"1px" }}>Dados do sistema</div>
                    </div>
                    {activeModule==="cadastros" && <div style={{ marginLeft:"auto",width:"4px",height:"20px",borderRadius:"2px",background:T.accent }}/>}
                  </>
                )}
              </div>
            </>
          )}

          {/* Usuários — visível para admin e editor */}
          {canManage && (
            <div className="side-item" onClick={()=>setShowUserMgmt(true)} title={sidebarCollapsed?"Usuários":""}
              style={{ padding:sidebarCollapsed?"10px":"10px 12px",display:"flex",alignItems:"center",gap:"10px",justifyContent:sidebarCollapsed?"center":"flex-start",background:"transparent",border:"1px solid transparent" }}>
              <span style={{ fontSize:"18px",lineHeight:1,flexShrink:0 }}>👥</span>
              {!sidebarCollapsed && (
                <div>
                  <div style={{ fontSize:"13px",fontWeight:500,color:T.text }}>Usuários</div>
                  <div style={{ fontSize:"10px",color:T.text3,marginTop:"1px" }}>Gerenciar acessos</div>
                </div>
              )}
            </div>
          )}

          {/* Sobre — visível para todos os perfis */}
          <div style={{ height:"1px",background:T.border,margin:"8px 4px" }}/>
          <div className="side-item" onClick={()=>{ setSelectedConsultor(isConsultor?currentUser.consultorName:null); setSelectedMonth("Todos"); setActiveModule("sobre"); }} title={sidebarCollapsed?"Sobre":""}
            style={{ padding:sidebarCollapsed?"10px":"10px 12px",display:"flex",alignItems:"center",gap:"10px",justifyContent:sidebarCollapsed?"center":"flex-start",background:activeModule==="sobre"?`${T.accent}18`:"transparent",border:activeModule==="sobre"?`1px solid ${T.accent}33`:"1px solid transparent" }}>
            <span style={{ fontSize:"18px",lineHeight:1,flexShrink:0 }}>ℹ️</span>
            {!sidebarCollapsed && (
              <>
                <div style={{ fontSize:"13px",fontWeight:activeModule==="sobre"?700:500,color:activeModule==="sobre"?T.accent:T.text3 }}>Sobre</div>
                {activeModule==="sobre" && <div style={{ marginLeft:"auto",width:"4px",height:"20px",borderRadius:"2px",background:T.accent }}/>}
              </>
            )}
          </div>
        </nav>
        <div style={{ padding:"12px",borderTop:"1px solid "+T.border,flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:"8px",justifyContent:sidebarCollapsed?"center":"flex-start" }}>
            <div style={{ width:"30px",height:"30px",borderRadius:"9px",background:`linear-gradient(135deg,${T.accent},${T.accentAlt})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:800,color:"#fff",flexShrink:0 }}>
              {getInitials(currentUser.consultorName||currentUser.username||"??")}
            </div>
            {!sidebarCollapsed && (
              <>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:"12px",fontWeight:700,color:T.heading,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{(currentUser.consultorName||currentUser.username||"").split(" ")[0]}</div>
                  <div style={{ fontSize:"9px",fontWeight:700,color:badge.color,marginTop:"2px",letterSpacing:"0.5px",textTransform:"uppercase" }}>{badge.label}</div>
                </div>
                <div style={{ display:"flex",gap:"4px",flexShrink:0 }}>
                  <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} title={isDark?"Tema claro":"Tema escuro"}
                    style={{ background:"transparent",border:"none",color:T.text3,cursor:"pointer",fontSize:"13px",padding:"4px",borderRadius:"6px" }}>{isDark?"☀️":"🌙"}</button>
                  <button onClick={onLogout} title="Sair"
                    style={{ background:"transparent",border:"none",color:T.text3,cursor:"pointer",fontSize:"13px",padding:"4px",borderRadius:"6px" }}>⎋</button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div style={{ marginLeft:SIDEBAR_W+"px",flex:1,display:"flex",flexDirection:"column",minHeight:"100vh",transition:SIDEBAR_TRANS }}>

        {/* Top bar */}
        <header style={{ background:T.headerBg,borderBottom:"1px solid "+T.headerBorder,padding:"0 28px",height:"56px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,backdropFilter:"blur(12px)" }}>
          <div>
            <span style={{ fontSize:"16px",fontWeight:700,color:T.heading }}>
              {MODULES.concat([{id:"cadastros",label:"Cadastros"}]).find(m=>m.id===activeModule)?.label || ""}
            </span>
            {activeModule==="agenda" && <span style={{ fontSize:"11px",color:T.text3,marginLeft:"10px" }}>{consultores.length} consultores · {Object.values(scheduleData).flat().filter(e=>e.type==="client").length} dias agendados</span>}
          </div>
          <div style={{ display:"flex",gap:"8px",alignItems:"center" }}>
            {activeModule==="agenda" && canEdit && (
              <button onClick={()=>{setEditEntry(null);setShowModal(true);}} className="action-btn"
                style={{ padding:"7px 16px",borderRadius:"10px",border:"none",cursor:"pointer",fontWeight:700,fontSize:"12px",background:`linear-gradient(135deg,${T.accent},${T.accentAlt})`,color:"#fff",display:"flex",alignItems:"center",gap:"6px",boxShadow:T.accentGlow }}>
                <span style={{ fontSize:"15px",lineHeight:1 }}>+</span> Nova Agenda
              </button>
            )}
            {activeModule==="agenda" && canEdit && (
              <button onClick={handleExportExcel} className="action-btn" title="Exportar Excel"
                style={{ padding:"7px 12px",borderRadius:"10px",border:"1px solid "+T.border2,cursor:"pointer",fontSize:"13px",background:T.btnInactive,color:T.text2 }}>📊</button>
            )}
            {activeModule==="agenda" && canManage && (
              <button onClick={handleInserirFeriados} className="action-btn" title="Inserir feriados nacionais na agenda de todos os consultores"
                style={{ padding:"7px 12px",borderRadius:"10px",border:"1px solid "+T.border2,cursor:"pointer",fontSize:"13px",background:T.btnInactive,color:T.text2 }}>🎉 Feriados</button>
            )}
          </div>
        </header>

        {/* ── READONLY BANNER ── */}
        {(isViewer || isConsultor) && activeModule==="agenda" && (
          <div style={{ background:isDark?"#f5a62308":"#fffbeb",borderBottom:"1px solid "+(isDark?"#f5a62320":"#fcd34d"),padding:"6px 28px",display:"flex",alignItems:"center",gap:"8px" }}>
            <span style={{ fontSize:"11px" }}>🔒</span>
            <span style={{ fontSize:"11px",color:"#f5a623",fontWeight:600 }}>
              {isConsultor ? `Acesso restrito — visualizando apenas a agenda de ${currentUser.consultorName}.` : "Modo visualização — sem permissão para editar agendas."}
            </span>
          </div>
        )}

        {/* ── MODULE: HOME (Dashboard) ── */}
        {activeModule==="home" && (
          <div style={{ padding:"28px 32px",flex:1 }}>
            <div style={{ marginBottom:"28px" }}>
              <h1 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"24px",fontWeight:900,color:T.heading,letterSpacing:"-0.5px",margin:"0 0 6px" }}>
                Olá, {(currentUser.consultorName||currentUser.nome||currentUser.username||"").split(" ")[0]} 👋
              </h1>
              <p style={{ fontSize:"13px",color:T.text2,margin:0 }}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</p>
            </div>

            {/* Cards de módulos */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"16px",marginBottom:"32px" }}>
              {[
                { id:"agenda",   icon:"📅", label:"Agenda de Consultores", desc:"Gerencie as agendas e cronogramas dos consultores",  color:"#6c63ff", stat:Object.values(scheduleData).flat().filter(e=>e.type==="client").length, statLabel:"dias agendados" },
                { id:"os",       icon:"📋", label:"Ordens de Serviço",     desc:"Consulte, aprove ou rejeite as OS dos consultores",   color:"#a78bfa", stat:Object.values(scheduleData).flat().filter(e=>e.osNumero).length, statLabel:"OS registradas" },
                { id:"viagens",  icon:"🏨", label:"Viagem e Hospedagem",   desc:"Solicitações de viagem, hospedagem e voos", color:"#22d3a0", stat:viaCount, statLabel:"solicitações" },
                { id:"projetos", icon:"📋", label:"Gestão de Projetos",    desc:"Acompanhe projetos, tarefas e horas trabalhadas",    color:"#f5a623", stat:projCount, statLabel:"projetos ativos" },
                ...(canManage?[{ id:"cadastros",icon:"🗂", label:"Cadastros", desc:"Consultores, clientes, projetos e configurações", color:"#a78bfa", stat:consultores.length, statLabel:"consultores" }]:[]),
              ].map(mod=>(
                <div key={mod.id} className="card-hover" onClick={()=>{ setSelectedConsultor(isConsultor?currentUser.consultorName:null); setSelectedMonth("Todos"); setActiveModule(mod.id); }}
                  style={{ background:T.surface,borderRadius:"16px",border:"1px solid "+T.border,padding:"22px",cursor:"pointer",position:"relative",overflow:"hidden" }}>
                  <div style={{ position:"absolute",top:0,left:0,right:0,height:"3px",background:`linear-gradient(90deg,${mod.color},${mod.color}88)` }}/>
                  <div style={{ fontSize:"28px",marginBottom:"14px" }}>{mod.icon}</div>
                  <div style={{ fontSize:"15px",fontWeight:700,color:T.heading,marginBottom:"6px" }}>{mod.label}</div>
                  <div style={{ fontSize:"12px",color:T.text2,lineHeight:1.5,marginBottom:"16px" }}>{mod.desc}</div>
                  <div style={{ display:"flex",alignItems:"baseline",gap:"5px" }}>
                    <span style={{ fontSize:"22px",fontWeight:800,color:mod.color }}>{mod.stat}</span>
                    <span style={{ fontSize:"11px",color:T.text3 }}>{mod.statLabel}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo rápido da semana */}
            <div style={{ background:T.surface,borderRadius:"16px",border:"1px solid "+T.border,padding:"20px" }}>
              <h3 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"15px",fontWeight:700,color:T.heading,margin:"0 0 16px" }}>📅 Agenda desta semana</h3>
              <WeeklyGlobalView key={"home-weekly"} weeklyData={weeklyData} offset={selectedWeekOffset} setOffset={setSelectedWeekOffset} clientColorMap={clientColorMap} canEdit={false} onEdit={null} onNewEntry={null} onOsClick={isConsultor?(e)=>setOsEntry(e):null} theme={T}/>
            </div>
          </div>
        )}

        {/* ── MODULE: AGENDA ── */}
        {activeModule==="agenda" && (
          <div style={{ display:"flex",flexDirection:"column",flex:1 }}>
            {/* Filtros */}
            <div style={{ background:T.surface,padding:"10px 28px",display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center",borderBottom:"1px solid "+T.border }}>
              {!isConsultor && (
                <select value={selectedConsultor||""} onChange={e=>setSelectedConsultor(e.target.value||null)}
                  style={{ padding:"7px 12px",borderRadius:"10px",border:"1px solid "+T.inputBorder,background:T.inputBg,color:T.inputColor,fontSize:"12px",cursor:"pointer",minWidth:"168px",fontFamily:"inherit",fontWeight:500 }}>
                  <option value="">Todos os consultores</option>
                  {consultores.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {isConsultor && (
                <div style={{ display:"flex",alignItems:"center",gap:"8px",padding:"5px 12px 5px 8px",borderRadius:"99px",background:T.btnInactive,border:"1px solid "+T.border }}>
                  <div style={{ width:"22px",height:"22px",borderRadius:"50%",background:`linear-gradient(135deg,${T.accent},${T.accentAlt})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:800,color:"#fff" }}>{getInitials(currentUser.consultorName||"")}</div>
                  <span style={{ fontSize:"12px",fontWeight:600,color:T.heading }}>{currentUser.consultorName}</span>
                </div>
              )}
              <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}
                style={{ padding:"7px 12px",borderRadius:"10px",border:"1px solid "+T.inputBorder,background:T.inputBg,color:T.inputColor,fontSize:"12px",cursor:"pointer",fontFamily:"inherit",fontWeight:500 }}>
                {allMonths.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <div style={{ position:"relative",display:"flex",alignItems:"center" }}>
                <span style={{ position:"absolute",left:"10px",fontSize:"12px",color:T.text3,pointerEvents:"none" }}>🔍</span>
                <input placeholder="Buscar cliente..." value={searchClient} onChange={e=>setSearchClient(e.target.value)}
                  style={{ padding:"7px 12px 7px 30px",borderRadius:"10px",border:"1px solid "+T.inputBorder,background:T.inputBg,color:T.inputColor,fontSize:"12px",minWidth:"160px",fontFamily:"inherit" }}/>
              </div>
              {selectedConsultor && (
                <div style={{ display:"flex",gap:"2px",background:T.btnInactive,borderRadius:"10px",padding:"2px",border:"1px solid "+T.border }}>
                  {[["semanal","📅 Semanal"],["mensal","🗓 Mensal"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setConsultorViewMode(v)} className="nav-btn"
                      style={{ padding:"5px 14px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"11px",background:consultorViewMode===v?T.accent:"transparent",color:consultorViewMode===v?"#fff":T.text2 }}>{l}</button>
                  ))}
                </div>
              )}
              {/* View tabs */}
              <div style={{ marginLeft:"auto",display:"flex",gap:"2px",background:T.btnInactive,borderRadius:"10px",padding:"2px",border:"1px solid "+T.border }}>
                {[...VIEWS, ...(selectedConsultor && !isConsultor ? ["os-perfil"] : [])].map(v=>(
                  <button key={v} onClick={()=>setView(v)} className={"nav-btn"+(view===v?" active":"")}
                    style={{ padding:"5px 12px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"11px",background:view===v?T.accent:"transparent",color:view===v?"#fff":T.text2,whiteSpace:"nowrap" }}>
                    {VIEW_LABELS[v]}
                  </button>
                ))}
              </div>
            </div>

            {/* Content area */}
            <div style={{ padding:"24px 28px",flex:1 }}>
              {view==="grid" && (
                selectedConsultor
                  ? consultorViewMode==="semanal"
                    ? selectedMonth!=="Todos"&&calendarData
                      ? <CalendarView consultant={selectedConsultor} month={selectedMonth} byDay={calendarData}/>
                      : <div style={{ textAlign:"center",padding:"60px 20px",color:T.text2,fontSize:"14px" }}><div style={{ fontSize:"36px",marginBottom:"12px" }}>📅</div>Selecione um mês específico para ver a visualização semanal</div>
                    : <CalendarioMensal key={"grid-"+selectedConsultor} data={{[selectedConsultor]: scheduleData[selectedConsultor]||[]}} selectedMonth={selectedMonth} allMonths={allMonths} consultores={[selectedConsultor]} clientColors={clientColorMap} readonly={!canEdit} onEdit={canEdit?(entry)=>{setEditEntry(entry);setShowModal(true);}:null} onDelete={canEdit?handleDeleteEntry:null} onNewEntry={canEdit?({consultor,month,day})=>{ setEditEntry({consultor,month,day,prefill:true}); setShowModal(true); }:null} onOsClick={isConsultor?(e)=>setOsEntry(e):null}/>
                  : <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"16px" }}>
                      {Object.entries(filteredData).filter(([,e])=>e.length>0).map(([name,entries])=>(
                        <ConsultorCard key={name} name={name} entries={entries} idx={consultores.indexOf(name)} onClick={()=>!isConsultor&&setSelectedConsultor(selectedConsultor===name?null:name)} selected={selectedConsultor===name}/>
                      ))}
                    </div>
              )}
              {view==="calendario" && (
                selectedConsultor && consultorViewMode==="semanal"
                  ? selectedMonth!=="Todos"&&calendarData
                    ? <CalendarView consultant={selectedConsultor} month={selectedMonth} byDay={calendarData}/>
                    : <div style={{ textAlign:"center",padding:"60px 20px",color:T.text2,fontSize:"14px" }}><div style={{ fontSize:"36px",marginBottom:"12px" }}>📅</div>Selecione um mês específico para ver a visualização semanal</div>
                  : <CalendarioMensal
                      key={"cal-"+(selectedConsultor||"all")}
                      data={selectedConsultor ? {[selectedConsultor]: scheduleData[selectedConsultor]||[]} : filteredData}
                      selectedMonth={selectedMonth}
                      allMonths={allMonths}
                      consultores={selectedConsultor ? [selectedConsultor] : (isConsultor?[currentUser.consultorName]:consultores)}
                      clientColors={clientColorMap}
                      readonly={!canEdit}
                      onEdit={canEdit?(entry)=>{setEditEntry(entry);setShowModal(true);}:null}
                      onDelete={canEdit?handleDeleteEntry:null}
                      onNewEntry={canEdit?({consultor,month,day})=>{ setEditEntry({consultor,month,day,prefill:true}); setShowModal(true); }:null}
                      onOsClick={isConsultor?(e)=>setOsEntry(e):null}
                    />
              )}
              {view==="semanal" && <WeeklyGlobalView key={"weekly"} weeklyData={weeklyData} offset={selectedWeekOffset} setOffset={setSelectedWeekOffset} clientColorMap={clientColorMap} canEdit={canEdit} onEdit={(entry,name)=>{setEditEntry({...entry,consultor:name});setShowModal(true);}} onNewEntry={canEdit?({consultor,month,day,year})=>{setEditEntry({consultor,month,day,year,prefill:true});setShowModal(true);}:null} onOsClick={isConsultor?(e)=>setOsEntry(e):null} theme={T}/>}
              {view==="timeline" && <TimelineView data={filteredData} months={allMonths.filter(m=>m!=="Todos")}/>}
              {view==="stats" && <StatsView stats={stats}/>}
              {view==="os-perfil" && selectedConsultor && (
                <PainelOSConsultor
                  consultorName={selectedConsultor}
                  scheduleData={scheduleData}
                  setScheduleData={setScheduleData}
                  setScheduleVersion={setScheduleVersion}
                  clientList={clientList}
                  emailConfig={emailConfig}
                  currentUser={currentUser}
                  onSaveEntry={handleSaveEntry}
                  onSaveOS={handleSaveOS}
                  theme={T}
                  modoGestor={true}
                />
              )}
            </div>
          </div>
        )}

        {/* ── MODULE: GRADE (consultor) ── */}
        {activeModule==="grade" && (
          <div style={{ padding:"28px 32px",flex:1 }}>
            {isConsultor
              ? <GradeConhecimento consultorName={currentUser.consultorName||currentUser.nome||currentUser.username||""} userId={currentUser.uid} readOnly={false}/>
              : <GradeAdminView consultores={consultores} scheduleData={scheduleData}
                  onAbrirAgenda={(consultorNome, mes) => {
                    setSelectedConsultor(consultorNome);
                    setSelectedMonth(mes);
                    setView("calendario");
                    setConsultorViewMode("mensal");
                    setActiveModule("agenda");
                  }}
                />
            }
          </div>
        )}

        {/* ── MODULE: ORDENS DE SERVIÇO ── */}
        {/* ── MODULE: TRASLADO ── */}
        {activeModule==="traslado" && (
          <div style={{ padding:"28px 32px",flex:1 }}>
            <ModuloTraslado
              currentUser={currentUser}
              canManage={canManage}
              canApprove={canApprove}
              consultores={consultores}
              clientList={clientList}
              projects={projects}
              theme={T}
            />
          </div>
        )}

        {/* ── MODULE: ALÇADAS DE APROVAÇÃO ── */}
        {activeModule==="alcadas" && (
          <div style={{ padding:"28px 32px",flex:1 }}>
            <ModuloAlcadas
              currentUser={currentUser}
              canManage={canManage}
              canApprove={canApprove}
              consultores={consultores}
              usuarios={usuarios}
              theme={T}
            />
          </div>
        )}

        {/* ── MODULE: MINHAS OS (consultor) ── */}
        {activeModule==="minhas-os" && isConsultor && (
          <div style={{ padding:"28px 32px",flex:1 }}>
            <PainelOSConsultor
              consultorName={currentUser.consultorName}
              scheduleData={scheduleData}
              setScheduleData={setScheduleData}
              setScheduleVersion={setScheduleVersion}
              clientList={clientList}
              emailConfig={emailConfig}
              currentUser={currentUser}
              onSaveEntry={handleSaveEntry}
              onSaveOS={handleSaveOS}
              theme={T}
            />
          </div>
        )}

        {activeModule==="os" && (
          <div style={{ padding:"28px 32px",flex:1 }}>
            <ModuloOrdemServico
              consultores={consultores}
              clientList={clientList}
              scheduleData={scheduleData}
              setScheduleData={setScheduleData}
              emailConfig={emailConfig}
              currentUser={currentUser}
              theme={T}
            />
          </div>
        )}

        {/* ── MODULE: VIAGENS ── */}
        {activeModule==="viagens" && (
          <div style={{ padding:"28px 32px",flex:1 }}>
            <ModuloViagens currentUser={currentUser} canEdit={canEdit} canManage={canManage} consultores={consultores} clientList={clientList} theme={T}/>
          </div>
        )}

        {/* ── MODULE: PROJETOS ── */}
        {activeModule==="projetos" && (
          <div style={{ padding:"28px 32px",flex:1 }}>
            <ModuloProjetos currentUser={currentUser} canEdit={canEdit} canManage={canManage} isGestor={isGestor} consultores={consultores} clients={clientList} scheduleData={scheduleData} onSaveEntry={handleSaveEntry} theme={T}/>
          </div>
        )}

        {/* ── MODULE: CADASTROS ── */}
        {activeModule==="cadastros" && canManage && (
          <div style={{ padding:"28px 32px",flex:1 }}>
            <CadastrosView
              consultores={consultores} clients={clientList} projects={projects}
              onAddConsultor={handleAddConsultor} onRemoveConsultor={handleRemoveConsultor} onUpdateConsultor={handleUpdateConsultor}
              onAddClient={handleAddClient} onRemoveClient={handleRemoveClient} onUpdateClient={handleUpdateClient}
              onAddProject={handleAddProject} onRemoveProject={handleRemoveProject} onUpdateProject={handleUpdateProject}
              emailConfig={emailConfig} onSaveEmailConfig={handleSaveEmailConfig}
            />
          </div>
        )}

        {/* ── MODULE: SOBRE ── */}
        {activeModule==="sobre" && (
          <div style={{ padding:"28px 32px",flex:1,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div style={{ maxWidth:"480px",width:"100%",textAlign:"center" }}>
              {/* Logo / ícone */}
              <div style={{ width:"80px",height:"80px",borderRadius:"22px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"36px",margin:"0 auto 28px",boxShadow:"0 8px 32px #6c63ff44" }}>
                ⬡
              </div>

              {/* Nome do sistema */}
              <h1 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"28px",fontWeight:900,color:"#f0f0fa",margin:"0 0 6px",letterSpacing:"-0.5px" }}>
                GSC
              </h1>
              <p style={{ fontSize:"13px",color:"#6e6e88",margin:"0 0 32px",letterSpacing:"1px",textTransform:"uppercase" }}>
                Gestão de Serviços Consultores
              </p>

              {/* Divisor */}
              <div style={{ width:"40px",height:"2px",background:"linear-gradient(90deg,#6c63ff,#a78bfa)",margin:"0 auto 32px",borderRadius:"2px" }}/>

              {/* Créditos */}
              <div style={{ background:"#111118",borderRadius:"16px",border:"1px solid #1f1f2e",padding:"28px 32px",marginBottom:"20px" }}>
                <div style={{ fontSize:"11px",color:"#3e3e55",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"16px" }}>
                  Desenvolvido por
                </div>
                <div style={{ fontSize:"20px",fontWeight:800,color:"#f0f0fa",fontFamily:"'Cabinet Grotesk',sans-serif",marginBottom:"4px" }}>
                  Marcelo Alexandre
                </div>
                <div style={{ fontSize:"12px",color:"#6e6e88" }}>
                  Desenvolvimento de Sistemas
                </div>
              </div>

              {/* Direitos */}
              <div style={{ fontSize:"12px",color:"#3e3e55",lineHeight:1.7 }}>
                © {new Date().getFullYear()} · Todos os direitos reservados
              </div>

              {/* Versão */}
              <div style={{ marginTop:"24px",display:"inline-flex",alignItems:"center",gap:"6px",padding:"4px 14px",borderRadius:"99px",background:"#6c63ff12",border:"1px solid #6c63ff22" }}>
                <span style={{ width:"6px",height:"6px",borderRadius:"50%",background:"#22d3a0",display:"inline-block" }}/>
                <span style={{ fontSize:"11px",color:"#6e6e88",fontWeight:600 }}>Versão 1.0.0</span>
              </div>
            </div>
          </div>
        )}

        {/* ── MODULE: MANUAL DO CONSULTOR ── */}
        {activeModule==="manual" && (
          <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <ManualConsultor theme={T}/>
          </div>
        )}
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ position:"fixed",bottom:"24px",right:"24px",background:isDark?"#18181f":"#ffffff",color:T.heading,padding:"12px 18px",borderRadius:"14px",fontWeight:600,fontSize:"13px",zIndex:9999,boxShadow:"0 8px 40px rgba(0,0,0,0.5)",animation:"fadeUp .25s cubic-bezier(.4,0,.2,1)",display:"flex",alignItems:"center",gap:"10px",maxWidth:"360px",border:"1px solid "+(isDark?"#2a2a3a":"#e4e4ea"),borderLeft:"3px solid "+(toast.color||"#6c63ff") }}>
          <div style={{ width:"8px",height:"8px",borderRadius:"50%",background:toast.color||"#6c63ff",flexShrink:0 }}/>{toast.msg}
        </div>
      )}

      {/* MODAL */}
      {showModal && canEdit && (
        <AgendaModal consultores={consultores} clients={clientList.map(c=>c.name)} months={MONTHS_ORDER} editEntry={editEntry} onSave={handleSaveEntry} onClose={()=>{setShowModal(false);setEditEntry(null);}}/>
      )}

      {/* MODAL ORDEM DE SERVIÇO */}
      {osEntry && (
        <OrdemServicoModal
          entry={osEntry}
          consultorName={currentUser.consultorName||currentUser.username||""}
          emailConfig={emailConfig}
          clientList={clientList}
          onSave={async (updatedEntry) => {
            await handleSaveOS(updatedEntry);
          }}
          onClose={()=>setOsEntry(null)}
        />
      )}

      {showUserMgmt && (
        <GerenciarUsuarios consultores={consultores} onAddConsultor={handleAddConsultor} onClose={()=>setShowUserMgmt(false)}/>
      )}
    </div>
  );
}
