import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

const responsablesIniciales = [
  { id: "1", nombre: "Juan Pérez", telefono: "600111222", usuario: "juan", password: "1234" },
  { id: "2", nombre: "María Gómez", telefono: "600333444", usuario: "maria", password: "1234" },
  { id: "3", nombre: "Antonio Ruiz", telefono: "600555666", usuario: "antonio", password: "1234" },
];

const interactoresIniciales = [
  { id: "1", nombre: "Pedro Gómez", telefono: "600777111", usuario: "interactor1", password: "1234", activo: true },
  { id: "2", nombre: "Lucía Romero", telefono: "600777222", usuario: "interactor2", password: "1234", activo: true },
];

const votsIniciales = [
  { referencia: "ES-001245", nombre: "Luna", telefono: "600000001", responsableId: "1", hora: "18:41", registrada: true },
  { referencia: "ES-001246", nombre: "Perla", telefono: "600000002", responsableId: "1", hora: null, registrada: false },
  { referencia: "ES-004112", nombre: "Estrella", telefono: "600000003", responsableId: "2", hora: "18:37", registrada: true },
  { referencia: "ES-005010", nombre: "Sol", telefono: "600000004", responsableId: "2", hora: null, registrada: false },
  { referencia: "ES-008921", nombre: "Nieve", telefono: "600000005", responsableId: "3", hora: "18:39", registrada: true },
  { referencia: "ES-009101", nombre: "Sombra", telefono: "600000006", responsableId: "3", hora: null, registrada: false },
];

const collectionNames = {
  responsables: "responsables",
  interactores: "interactores",
  vots: "vots",
};

function withFirestoreId(documentSnapshot) {
  return { id: documentSnapshot.id, ...documentSnapshot.data() };
}

async function seedCollectionIfEmpty(collectionName, items) {
  const snapshot = await getDocs(collection(db, collectionName));
  if (!snapshot.empty) return;

  const batch = writeBatch(db);
  items.forEach((item) => {
    const documentId = item.referencia ?? item.id;
    batch.set(doc(db, collectionName, String(documentId)), item);
  });
  await batch.commit();
}

function Badge({ children, tone = "gray" }) {
  const styles = {
    gray: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium ${styles[tone]}`}>
      {children}
    </span>
  );
}

function Card({ children, className = "" }) {
  return <div className={`rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm ${className}`}>{children}</div>;
}

function StatCard({ title, value }) {
  return (
    <Card className="p-5">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-3 text-2xl font-bold text-slate-950">{value}</div>
    </Card>
  );
}

function LogoutButton({ onLogout }) {
  return (
    <button onClick={onLogout} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium">
      Salir
    </button>
  );
}

function LoginScreen({ onLogin, responsables, interactores }) {
  const [rol, setRol] = useState("cooperativa");
  const [usuario, setUsuario] = useState("admin");
  const [password, setPassword] = useState("");

  const entrar = () => {
    if (rol === "cooperativa") {
      if (password === "17052026") onLogin({ rol, usuario: "admin" });
      else alert("Contraseña incorrecta");
      return;
    }

    if (rol === "responsable") {
      const user = responsables.find((r) => r.usuario === usuario && r.password === password);
      if (user) onLogin({ rol, usuario });
      else alert("Credenciales incorrectas");
      return;
    }

    if (rol === "interactor") {
      const user = interactores.find((i) => i.usuario === usuario && i.password === password && i.activo);
      if (user) onLogin({ rol, usuario });
      else alert("Credenciales incorrectas");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-5 py-8 md:px-8">
      <div className="mx-auto max-w-xl">
        <Card>
          <h1 className="text-3xl font-bold text-slate-950">Acceso a la aplicación</h1>
          <p className="mt-2 text-slate-600">Selecciona el perfil para entrar.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Perfil</label>
              <select
                value={rol}
                onChange={(e) => {
                  const nuevoRol = e.target.value;
                  setRol(nuevoRol);
                  setPassword("");
                  if (nuevoRol === "responsable") setUsuario(responsables[0]?.usuario || "");
                  else if (nuevoRol === "interactor") setUsuario(interactores[0]?.usuario || "");
                  else setUsuario("admin");
                }}
                className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none"
              >
                <option value="cooperativa">Panel de control</option>
                <option value="interactor">Interactor</option>
                <option value="responsable">Responsable</option>
              </select>
            </div>

            {rol === "responsable" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Responsable</label>
                <select value={usuario} onChange={(e) => setUsuario(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none">
                  {responsables.map((r) => <option key={r.id} value={r.usuario}>{r.nombre}</option>)}
                </select>
              </div>
            )}

            {rol === "interactor" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Interactor</label>
                <select value={usuario} onChange={(e) => setUsuario(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none">
                  {interactores.filter(i => i.activo).map((i) => <option key={i.id} value={i.usuario}>{i.nombre}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none"
              />
            </div>

            <button onClick={entrar} className="h-12 w-full rounded-xl bg-slate-950 text-white font-semibold">Entrar</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function InteractorScreen({ onLogout, vots, usuario, interactores }) {
  const [referencia, setReferencia] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("gray");

  const registrar = async () => {
    const ref = referencia.trim().toUpperCase();
    if (!ref) return;

    const existe = vots.find((o) => o.referencia === ref);
    if (!existe) {
      setMensaje("Referencia no encontrada");
      setTipoMensaje("red");
      return;
    }

    if (existe.registrada) {
      setMensaje("Ya registrada");
      setTipoMensaje("amber");
      return;
    }

    const hora = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    try {
      await updateDoc(doc(db, collectionNames.vots, ref), {
        registrada: true,
        hora,
        registradaPor: usuario,
        registradaEn: new Date().toISOString(),
      });
      setReferencia("");
      setMensaje("Registrada correctamente");
      setTipoMensaje("green");
    } catch {
      setMensaje("No se pudo guardar en Firebase");
      setTipoMensaje("red");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-5 py-6 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">Pantalla interactor</h1>
              <p className="mt-2 text-slate-600">Solo puede registrar referencias.</p>
              <p className="mt-1 text-sm text-slate-500">Interactor activo: {interactores.find(i => i.usuario === usuario)?.nombre || usuario}</p>
            </div>
            <LogoutButton onLogout={onLogout} />
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-slate-950">Registro de entrada</h2>
          <div className="mt-5 flex flex-col gap-4 md:flex-row">
            <input
              value={referencia}
              onChange={(e) => setReferencia(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && registrar()}
              placeholder="Referencia"
              className="h-14 flex-1 rounded-xl border border-slate-200 px-4 text-lg outline-none"
            />
            <button onClick={registrar} className="h-14 rounded-xl bg-slate-950 px-8 text-white font-semibold">Registrar</button>
          </div>
          <div className="mt-4"><Badge tone={tipoMensaje}>{mensaje || "Esperando referencia"}</Badge></div>
        </Card>
      </div>
    </div>
  );
}

function ResponsableScreen({ onLogout, usuario, vots, responsables }) {
  const responsable = responsables.find((r) => r.usuario === usuario);
  const votsResp = vots.filter((o) => o.responsableId === responsable?.id);
  const llegadas = votsResp.filter((o) => o.registrada).length;
  const pendientes = votsResp.length - llegadas;

  return (
    <div className="min-h-screen bg-slate-100 px-5 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">Pantalla responsable</h1>
              <p className="mt-2 text-slate-600">Solo ve sus VOTs.</p>
            </div>
            <LogoutButton onLogout={onLogout} />
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Responsable" value={responsable?.nombre || "-"} />
          <StatCard title="Llegadas" value={llegadas} />
          <StatCard title="Pendientes" value={pendientes} />
        </div>

        <Card>
          <h2 className="text-xl font-bold text-slate-950">Estado de sus VOTs</h2>
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left">Referencia</th>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Teléfono</th>
                  <th className="px-4 py-3 text-left">Hora</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {votsResp.map((o) => (
                  <tr key={o.referencia} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-semibold">{o.referencia}</td>
                    <td className="px-4 py-3">{o.nombre}</td>
                    <td className="px-4 py-3">{o.telefono}</td>
                    <td className="px-4 py-3">{o.hora || "-"}</td>
                    <td className="px-4 py-3">{o.registrada ? <Badge tone="green">Ha entrado</Badge> : <Badge tone="amber">Falta</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CooperativaScreen({ onLogout, vots, responsables, interactores }) {
  const [nuevaReferencia, setNuevaReferencia] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoResponsableId, setNuevoResponsableId] = useState(responsables[0]?.id || "");
  const [mensajeImportacion, setMensajeImportacion] = useState("");

  const [nombreResponsable, setNombreResponsable] = useState("");
  const [telefonoResponsable, setTelefonoResponsable] = useState("");
  const [passwordResponsable, setPasswordResponsable] = useState("");

  const [nombreInteractor, setNombreInteractor] = useState("");
  const [telefonoInteractor, setTelefonoInteractor] = useState("");
  const [passwordInteractor, setPasswordInteractor] = useState("");

  const total = vots.length;
  const llegadas = vots.filter((o) => o.registrada).length;
  const pendientes = total - llegadas;

  const crearVot = async () => {
    if (!nuevaReferencia || !nuevoResponsableId) return;
    const referencia = nuevaReferencia.toUpperCase();
    if (vots.some((o) => o.referencia === referencia)) return;

    await setDoc(doc(db, collectionNames.vots, referencia), {
      referencia,
      nombre: nuevoNombre,
      telefono: nuevoTelefono,
      responsableId: String(nuevoResponsableId),
      hora: null,
      registrada: false,
    });

    setNuevaReferencia("");
    setNuevoNombre("");
    setNuevoTelefono("");
  };

  const importarExcel = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const nombreHoja = workbook.SheetNames[0];
        const hoja = workbook.Sheets[nombreHoja];
        const filas = XLSX.utils.sheet_to_json(hoja);

        let importados = 0;
        let errores = 0;
        const existentes = new Set(vots.map((v) => v.referencia));

        const nuevos = [];

        filas.forEach((fila) => {
          const referencia = String(fila.referencia || "").trim().toUpperCase();
          const nombre = String(fila.nombre || "").trim();
          const telefono = String(fila.telefono || "").trim();
          const nombreResponsable = String(fila.responsable || "").trim().toLowerCase();

          const responsable = responsables.find(
            (r) => r.nombre.trim().toLowerCase() === nombreResponsable
          );

          if (!referencia || !responsable || existentes.has(referencia)) {
            errores += 1;
            return;
          }

          existentes.add(referencia);
          nuevos.push({
            referencia,
            nombre,
            telefono,
            responsableId: responsable.id,
            hora: null,
            registrada: false,
          });
          importados += 1;
        });

        if (nuevos.length) {
          const batch = writeBatch(db);
          nuevos.forEach((vot) => {
            batch.set(doc(db, collectionNames.vots, vot.referencia), vot);
          });
          await batch.commit();
        }
        setMensajeImportacion(`Importación completada. Correctos: ${importados}. Errores: ${errores}.`);
      } catch (error) {
        setMensajeImportacion("Error al leer el Excel.");
      }
    };

    reader.readAsArrayBuffer(file);
    event.target.value = "";
  };

  const crearResponsable = async () => {
    if (!nombreResponsable || !passwordResponsable) return;
    const usuario = nombreResponsable.toLowerCase().split(" ")[0];
    const id = String(Date.now());
    await setDoc(doc(db, collectionNames.responsables, id), {
      id,
      nombre: nombreResponsable,
      telefono: telefonoResponsable,
      usuario,
      password: passwordResponsable,
    });
    setNombreResponsable("");
    setTelefonoResponsable("");
    setPasswordResponsable("");
  };

  const crearInteractor = async () => {
    if (!nombreInteractor || !passwordInteractor) return;
    const usuario = nombreInteractor.toLowerCase().split(" ")[0] + interactores.length;
    const id = String(Date.now());
    await setDoc(doc(db, collectionNames.interactores, id), {
      id,
      nombre: nombreInteractor,
      telefono: telefonoInteractor,
      usuario,
      password: passwordInteractor,
      activo: true,
    });
    setNombreInteractor("");
    setTelefonoInteractor("");
    setPasswordInteractor("");
  };

  return (
    <div className="min-h-screen bg-slate-100 px-5 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">Panel de control</h1>
              <p className="mt-2 text-slate-600">Gestión completa.</p>
            </div>
            <LogoutButton onLogout={onLogout} />
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Total VOTs" value={total} />
          <StatCard title="Llegadas" value={llegadas} />
          <StatCard title="Pendientes" value={pendientes} />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Card>
            <h2 className="text-lg font-bold text-slate-950">Alta de VOT</h2>
            <div className="mt-4 space-y-3">
              <input value={nuevaReferencia} onChange={(e) => setNuevaReferencia(e.target.value.toUpperCase())} placeholder="Referencia" className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none" />
              <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre" className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none" />
              <input value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)} placeholder="Teléfono" className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none" />
              <select value={nuevoResponsableId} onChange={(e) => setNuevoResponsableId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none">
                {responsables.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
              <button onClick={crearVot} className="h-11 w-full rounded-xl bg-slate-950 text-white font-semibold">Crear VOT</button>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-950">Importar Excel</h2>
            <p className="mt-2 text-sm text-slate-500">Columnas: referencia, nombre, telefono, responsable</p>
            <div className="mt-4 space-y-3">
              <input type="file" accept=".xlsx,.xls" onChange={importarExcel} className="block w-full text-sm text-slate-700" />
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                Ejemplo responsable: Juan Pérez
              </div>
              {mensajeImportacion ? <Badge tone="gray">{mensajeImportacion}</Badge> : null}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-950">Alta de responsable</h2>
            <div className="mt-4 space-y-3">
              <input value={nombreResponsable} onChange={(e) => setNombreResponsable(e.target.value)} placeholder="Nombre" className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none" />
              <input value={telefonoResponsable} onChange={(e) => setTelefonoResponsable(e.target.value)} placeholder="Teléfono" className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none" />
              <input type="password" value={passwordResponsable} onChange={(e) => setPasswordResponsable(e.target.value)} placeholder="Contraseña" className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none" />
              <button onClick={crearResponsable} className="h-11 w-full rounded-xl bg-slate-950 text-white font-semibold">Crear responsable</button>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <h2 className="text-lg font-bold text-slate-950">Alta de interactor</h2>
            <div className="mt-4 space-y-3">
              <input value={nombreInteractor} onChange={(e) => setNombreInteractor(e.target.value)} placeholder="Nombre" className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none" />
              <input value={telefonoInteractor} onChange={(e) => setTelefonoInteractor(e.target.value)} placeholder="Teléfono" className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none" />
              <input type="password" value={passwordInteractor} onChange={(e) => setPasswordInteractor(e.target.value)} placeholder="Contraseña" className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none" />
              <button onClick={crearInteractor} className="h-11 w-full rounded-xl bg-slate-950 text-white font-semibold">Crear interactor</button>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-950">Consulta general</h2>
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left">Referencia</th>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Teléfono</th>
                    <th className="px-4 py-3 text-left">Responsable</th>
                    <th className="px-4 py-3 text-left">Hora</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {vots.map((o) => {
                    const responsable = responsables.find((r) => r.id === o.responsableId);
                    return (
                      <tr key={o.referencia} className="border-t border-slate-200">
                        <td className="px-4 py-3 font-semibold">{o.referencia}</td>
                        <td className="px-4 py-3">{o.nombre}</td>
                        <td className="px-4 py-3">{o.telefono}</td>
                        <td className="px-4 py-3">{responsable?.nombre}</td>
                        <td className="px-4 py-3">{o.hora || "-"}</td>
                        <td className="px-4 py-3">{o.registrada ? <Badge tone="green">Ha entrado</Badge> : <Badge tone="amber">Falta</Badge>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [sesion, setSesion] = useState(null);
  const [vots, setVots] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [interactores, setInteractores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [firebaseError, setFirebaseError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let unsubscribers = [];

    async function connectFirestore() {
      try {
        await Promise.all([
          seedCollectionIfEmpty(collectionNames.responsables, responsablesIniciales),
          seedCollectionIfEmpty(collectionNames.interactores, interactoresIniciales),
          seedCollectionIfEmpty(collectionNames.vots, votsIniciales),
        ]);

        if (cancelled) return;

        unsubscribers = [
          onSnapshot(query(collection(db, collectionNames.responsables), orderBy("nombre")), (snapshot) => {
            setResponsables(snapshot.docs.map(withFirestoreId));
          }),
          onSnapshot(query(collection(db, collectionNames.interactores), orderBy("nombre")), (snapshot) => {
            setInteractores(snapshot.docs.map(withFirestoreId));
          }),
          onSnapshot(query(collection(db, collectionNames.vots), orderBy("referencia")), (snapshot) => {
            setVots(snapshot.docs.map((item) => item.data()));
            setCargando(false);
          }),
        ];
      } catch (error) {
        setFirebaseError("No se pudo conectar con Firebase. Revisa Firestore y sus reglas.");
        setResponsables(responsablesIniciales);
        setInteractores(interactoresIniciales);
        setVots(votsIniciales);
        setCargando(false);
      }
    }

    connectFirestore();

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-100 px-5 py-8 md:px-8">
        <div className="mx-auto max-w-xl">
          <Card>
            <h1 className="text-3xl font-bold text-slate-950">Cargando datos</h1>
            <p className="mt-2 text-slate-600">Conectando con Firebase...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (!sesion) {
    return (
      <>
        {firebaseError ? (
          <div className="bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">{firebaseError}</div>
        ) : null}
        <LoginScreen onLogin={setSesion} responsables={responsables} interactores={interactores} />
      </>
    );
  }

  if (sesion.rol === "interactor") {
    return <InteractorScreen onLogout={() => setSesion(null)} vots={vots} usuario={sesion.usuario} interactores={interactores} />;
  }

  if (sesion.rol === "responsable") {
    return <ResponsableScreen onLogout={() => setSesion(null)} usuario={sesion.usuario} vots={vots} responsables={responsables} />;
  }

  return (
    <CooperativaScreen
      onLogout={() => setSesion(null)}
      vots={vots}
      responsables={responsables}
      interactores={interactores}
    />
  );
}
