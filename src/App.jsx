import React, { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

const responsablesIniciales = [
  { id: "1", nombre: "Juan Pérez", telefono: "600111222", usuario: "juan", password: "1234" },
  { id: "2", nombre: "María Gómez", telefono: "600333444", usuario: "maria", password: "1234" },
  { id: "3", nombre: "Antonio Ruiz", telefono: "600555666", usuario: "antonio", password: "1234" },
];

const mesasIniciales = [];

const votsIniciales = [];

const collectionNames = {
  registros: "registros",
  vots: "vots",
  responsables: "responsables",
  mesas: "mesas",
};

const sessionStorageKey = "andaluzas26-session";

function readStoredSession() {
  try {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(sessionStorageKey);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function safeDocId(value) {
  return encodeURIComponent(String(value || "").trim()).replace(/\./g, "%2E");
}

function registroDocId(numero) {
  return safeDocId(numero);
}

async function guardarVot(vot) {
  await setDoc(doc(db, collectionNames.vots, safeDocId(vot.numero)), vot);
}

async function guardarResponsable(responsable) {
  await setDoc(doc(db, collectionNames.responsables, safeDocId(responsable.id)), responsable);
}

async function guardarMesa(mesa) {
  await setDoc(doc(db, collectionNames.mesas, safeDocId(mesa.id)), mesa);
}

function withFirestoreId(documentSnapshot) {
  return { id: documentSnapshot.id, ...documentSnapshot.data() };
}

function applyRegistros(vots, registros) {
  const byNumero = new Map(registros.map((registro) => [registro.numero ?? registro.referencia, registro]));
  return vots.map((vot) => {
    const registro = byNumero.get(vot.numero);
    return registro
      ? {
          ...vot,
          registrada: true,
          hora: registro.hora,
          registradaPor: registro.registradoPor ?? registro.mesa,
          registradaEn: registro.registradaEn,
        }
      : { ...vot, registrada: false, hora: null, registradaPor: null, registradaEn: null };
  });
}

async function guardarRegistro(vot, origen) {
  const hora = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const registroRef = doc(db, collectionNames.registros, registroDocId(vot.numero));
  await setDoc(registroRef, {
    numero: vot.numero,
    nombre: vot.nombre,
    telefono: vot.telefono,
    mesaVot: vot.mesa,
    colegio: vot.colegio,
    hora,
    registradoPor: origen,
    registradaEn: new Date().toISOString(),
  });
  return hora;
}

function firebaseErrorMessage(error) {
  const code = error?.code ? `${error.code}: ` : "";
  return `${code}${error?.message || "Error desconocido"}`;
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

function whatsappUrl(telefono, nombre) {
  const cleanedPhone = String(telefono || "").replace(/\D/g, "");
  const phone = cleanedPhone.startsWith("34") ? cleanedPhone : `34${cleanedPhone}`;
  const text = encodeURIComponent(`Hola ${nombre}, te recordamos que aún no consta tu entrada.`);
  return `https://wa.me/${phone}?text=${text}`;
}

function createUsuario(nombre, fallback) {
  const normalized = String(nombre || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  return normalized || fallback;
}

function normalizeKey(key) {
  return String(key || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeRow(row) {
  return Object.entries(row).reduce((normalized, [key, value]) => {
    normalized[normalizeKey(key)] = value;
    return normalized;
  }, {});
}

function readCell(row, keys) {
  for (const key of keys) {
    const normalizedKey = normalizeKey(key);
    const matchingKey = Object.keys(row).find((rowKey) => rowKey === normalizedKey || rowKey.startsWith(normalizedKey));
    const value = matchingKey ? row[matchingKey] : undefined;
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

const excelColumns = {
  numero: ["numero", "número", "num", "n", "nº", "no", "referencia", "ref"],
  nombre: ["nombre", "nombre completo", "vot", "vots", "persona"],
  telefono: ["telefono", "teléfono", "tfno", "tel", "movil", "móvil"],
  mesa: ["mesa", "mesa electoral"],
  colegio: ["colegio", "colegio electoral", "centro"],
  responsable: ["responsable", "responsable vot", "coordinador", "resp"],
};

function rowHasAny(row, keys) {
  return keys.some((key) => Object.keys(row).some((rowKey) => rowKey === normalizeKey(key) || rowKey.startsWith(normalizeKey(key))));
}

function parseExcelRows(sheet) {
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const headerIndex = rawRows.findIndex((row) => {
    const normalizedHeaders = row.reduce((headers, cell) => {
      const key = normalizeKey(cell);
      if (key) headers[key] = cell;
      return headers;
    }, {});

    const hasNumero = rowHasAny(normalizedHeaders, excelColumns.numero);
    const hasMesa = rowHasAny(normalizedHeaders, excelColumns.mesa);
    const hasResponsable = rowHasAny(normalizedHeaders, excelColumns.responsable);
    return hasNumero && hasMesa && hasResponsable;
  });

  if (headerIndex === -1) return [];

  const headers = rawRows[headerIndex].map((cell) => normalizeKey(cell));
  return rawRows.slice(headerIndex + 1).map((row) => {
    return headers.reduce((item, header, index) => {
      if (header) item[header] = row[index];
      return item;
    }, {});
  });
}

function LogoutButton({ onLogout }) {
  return (
    <button onClick={onLogout} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium">
      Salir
    </button>
  );
}

function LoginScreen({ onLogin, responsables, mesas }) {
  const [rol, setRol] = useState("panel");
  const [usuario, setUsuario] = useState("admin");
  const [password, setPassword] = useState("");

  const entrar = () => {
    if (rol === "panel") {
      if (password === "1705") onLogin({ rol, usuario: "admin" });
      else alert("Contraseña incorrecta");
      return;
    }

    if (rol === "responsable") {
      const user = responsables.find((r) => r.usuario === usuario && r.password === password);
      if (user) onLogin({ rol, usuario });
      else alert("Credenciales incorrectas");
      return;
    }

    if (rol === "mesa") {
      const user = mesas.find((i) => i.usuario === usuario && i.password === password && i.activo);
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
                  else if (nuevoRol === "mesa") setUsuario(mesas[0]?.usuario || "");
                  else setUsuario("admin");
                }}
                className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none"
              >
                <option value="panel">Panel de control</option>
                <option value="mesa">Mesa</option>
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

            {rol === "mesa" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Mesa</label>
                <select value={usuario} onChange={(e) => setUsuario(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none">
                  {mesas.filter(i => i.activo).map((i) => <option key={i.id} value={i.usuario}>{i.nombre}</option>)}
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

function MesaScreen({ onLogout, vots, usuario, mesas }) {
  const mesaActual = mesas.find((item) => item.usuario === usuario);
  const mesaSeleccionada = mesaActual?.nombre ?? "";
  const [numero, setNumero] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("gray");
  const votsMesa = vots.filter((vot) => vot.mesa === mesaSeleccionada);

  const registrar = async () => {
    const numeroNormalizado = numero.trim();
    if (!numeroNormalizado) return;

    const existe = votsMesa.find((o) => o.numero === numeroNormalizado);
    if (!existe) {
      setMensaje("Número no encontrado en esta mesa");
      setTipoMensaje("red");
      return;
    }

    if (existe.registrada) {
      setMensaje("Ya registrada");
      setTipoMensaje("amber");
      return;
    }

    try {
      await guardarRegistro(existe, usuario);
      setNumero("");
      setMensaje("Registrada y guardada en Firebase");
      setTipoMensaje("green");
    } catch (error) {
      console.error("Error guardando registro desde mesa", error);
      setMensaje(`Firebase: ${firebaseErrorMessage(error)}`);
      setTipoMensaje("red");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-5 py-6 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">Pantalla mesa</h1>
              <p className="mt-2 text-slate-600">Selecciona mesa y marca VOTs por número.</p>
              <p className="mt-1 text-sm text-slate-500">Mesa activa: {mesas.find(i => i.usuario === usuario)?.nombre || usuario}</p>
            </div>
            <LogoutButton onLogout={onLogout} />
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-slate-950">Registro de entrada</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr_auto]">
            <div className="flex h-14 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-lg font-semibold text-slate-800">
              {mesaSeleccionada || "Mesa no encontrada"}
            </div>
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && registrar()}
              placeholder="Número de VOT"
              className="h-14 rounded-xl border border-slate-200 px-4 text-lg outline-none"
            />
            <button onClick={registrar} className="h-14 rounded-xl bg-slate-950 px-8 text-white font-semibold">Registrar</button>
          </div>
          <div className="mt-4"><Badge tone={tipoMensaje}>{mensaje || "Esperando número"}</Badge></div>
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
                  <th className="px-4 py-3 text-left">Número</th>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Teléfono</th>
                  <th className="px-4 py-3 text-left">Mesa</th>
                  <th className="px-4 py-3 text-left">Hora</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Aviso</th>
                  <th className="px-4 py-3 text-left">Colegio</th>
                </tr>
              </thead>
              <tbody>
                {votsResp.map((o) => (
                  <tr key={o.numero} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-semibold">{o.numero}</td>
                    <td className="px-4 py-3">{o.nombre}</td>
                    <td className="px-4 py-3">{o.telefono}</td>
                    <td className="px-4 py-3">{o.mesa}</td>
                    <td className="px-4 py-3">{o.hora || "-"}</td>
                    <td className="px-4 py-3">{o.registrada ? <Badge tone="green">Ha entrado</Badge> : <Badge tone="amber">Falta</Badge>}</td>
                    <td className="px-4 py-3">
                      {!o.registrada ? (
                        <a
                          className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                          href={whatsappUrl(o.telefono, o.nombre)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          WhatsApp
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{o.colegio || "-"}</td>
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

function PanelControlScreen({ onLogout, vots, setBaseVots, responsables, setResponsables, mesas, setMesas }) {
  const [nuevoNumero, setNuevoNumero] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoResponsableId, setNuevoResponsableId] = useState(responsables[0]?.id || "");
  const [nuevaMesa, setNuevaMesa] = useState(mesas[0]?.nombre || "");
  const [nuevoColegio, setNuevoColegio] = useState("");
  const [mensajeImportacion, setMensajeImportacion] = useState("");

  const [nombreResponsable, setNombreResponsable] = useState("");
  const [telefonoResponsable, setTelefonoResponsable] = useState("");
  const [passwordResponsable, setPasswordResponsable] = useState("");

  const [nombreMesa, setNombreMesa] = useState("");
  const [telefonoMesa, setTelefonoMesa] = useState("");
  const [passwordMesa, setPasswordMesa] = useState("");
  const [panelMesa, setPanelMesa] = useState(mesas[0]?.nombre || "");
  const [panelNumero, setPanelNumero] = useState("");
  const [panelMensaje, setPanelMensaje] = useState("");
  const [panelMensajeTipo, setPanelMensajeTipo] = useState("gray");
  const [consultaMesa, setConsultaMesa] = useState("");
  const [consultaResponsableId, setConsultaResponsableId] = useState("");
  const panelMesaTableRef = useRef(null);

  const total = vots.length;
  const llegadas = vots.filter((o) => o.registrada).length;
  const pendientes = total - llegadas;
  const votsPanelMesa = vots.filter((vot) => vot.mesa === panelMesa);
  const pendientesPanelMesa = votsPanelMesa.filter((vot) => !vot.registrada);
  const votsConsulta = vots.filter((vot) => {
    const matchesMesa = !consultaMesa || vot.mesa === consultaMesa;
    const matchesResponsable = !consultaResponsableId || vot.responsableId === consultaResponsableId;
    return matchesMesa && matchesResponsable;
  });

  useEffect(() => {
    const tableContainer = panelMesaTableRef.current;
    if (tableContainer) {
      tableContainer.scrollTop = tableContainer.scrollHeight;
    }
  }, [panelMesa, votsPanelMesa.length]);

  const registrarDesdePanel = async () => {
    const numeroNormalizado = panelNumero.trim();
    if (!numeroNormalizado) return;

    const existe = votsPanelMesa.find((vot) => vot.numero === numeroNormalizado);
    if (!existe) {
      setPanelMensaje("Número no encontrado en esta mesa");
      setPanelMensajeTipo("red");
      return;
    }

    if (existe.registrada) {
      setPanelMensaje("Ya registrado");
      setPanelMensajeTipo("amber");
      return;
    }

    try {
      await guardarRegistro(existe, "panel");
      setPanelNumero("");
      setPanelMensaje("Registrado y guardado en Firebase");
      setPanelMensajeTipo("green");
    } catch (error) {
      console.error("Error guardando registro desde panel", error);
      setPanelMensaje(`Firebase: ${firebaseErrorMessage(error)}`);
      setPanelMensajeTipo("red");
    }
  };

  const crearVot = async () => {
    if (!nuevoNumero || !nuevoResponsableId || !nuevaMesa) return;
    const numero = nuevoNumero.trim();
    if (vots.some((o) => o.numero === numero)) return;

    const nuevoVot = {
      numero,
      nombre: nuevoNombre,
      telefono: nuevoTelefono,
      mesa: nuevaMesa,
      responsableId: String(nuevoResponsableId),
      colegio: nuevoColegio,
    };

    try {
      await guardarVot(nuevoVot);
    } catch (error) {
      alert(`No se pudo guardar el VOT en Firebase: ${firebaseErrorMessage(error)}`);
      return;
    }

    setBaseVots((current) => [
      ...current,
      nuevoVot,
    ]);

    setNuevoNumero("");
    setNuevoNombre("");
    setNuevoTelefono("");
    setNuevoColegio("");
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
        const filas = parseExcelRows(hoja);

        let importados = 0;
        let errores = filas.length ? 0 : 1;
        const existentes = new Set(vots.map((v) => v.numero));

        const nuevos = [];
        const responsablesActualizados = [...responsables];
        const mesasActualizadas = [...mesas];
        const responsablesPorNombre = new Map(
          responsablesActualizados.map((responsable) => [responsable.nombre.trim().toLowerCase(), responsable])
        );
        const mesasPorNombre = new Map(
          mesasActualizadas.map((mesaItem) => [mesaItem.nombre.trim().toLowerCase(), mesaItem])
        );

        filas.forEach((fila, index) => {
          const numero = readCell(fila, excelColumns.numero);
          const nombre = readCell(fila, excelColumns.nombre);
          const telefono = readCell(fila, excelColumns.telefono);
          const mesa = readCell(fila, excelColumns.mesa);
          const colegio = readCell(fila, excelColumns.colegio);
          const nombreResponsableOriginal = readCell(fila, excelColumns.responsable);
          const nombreResponsable = nombreResponsableOriginal.toLowerCase();

          if (!numero || !mesa || !nombreResponsableOriginal || existentes.has(numero)) {
            errores += 1;
            return;
          }

          let responsable = responsablesPorNombre.get(nombreResponsable);
          if (!responsable) {
            responsable = {
              id: `resp-${Date.now()}-${index}`,
              nombre: nombreResponsableOriginal,
              telefono: readCell(fila, ["telefono responsable", "teléfono responsable", "movil responsable", "móvil responsable"]),
              usuario: createUsuario(nombreResponsableOriginal, `responsable${responsablesActualizados.length + 1}`),
              password: "1234",
            };
            responsablesActualizados.push(responsable);
            responsablesPorNombre.set(nombreResponsable, responsable);
          }

          const mesaKey = mesa.toLowerCase();
          let mesaEncontrada = mesasPorNombre.get(mesaKey);
          if (!mesaEncontrada) {
            mesaEncontrada = {
              id: `mesa-${Date.now()}-${index}`,
              nombre: mesa,
              usuario: createUsuario(mesa, `mesa${mesasActualizadas.length + 1}`),
              password: "1234",
              activo: true,
            };
            mesasActualizadas.push(mesaEncontrada);
            mesasPorNombre.set(mesaKey, mesaEncontrada);
          }

          existentes.add(numero);
          nuevos.push({
            numero,
            nombre,
            telefono,
            mesa: mesaEncontrada.nombre,
            responsableId: responsable.id,
            colegio,
          });
          importados += 1;
        });

        await Promise.all([
          ...nuevos.map(guardarVot),
          ...responsablesActualizados.slice(responsables.length).map(guardarResponsable),
          ...mesasActualizadas.slice(mesas.length).map(guardarMesa),
        ]);

        if (responsablesActualizados.length !== responsables.length) {
          setResponsables(responsablesActualizados);
        }
        if (mesasActualizadas.length !== mesas.length) {
          setMesas(mesasActualizadas);
        }
        if (!panelMesa && mesasActualizadas[0]) {
          setPanelMesa(mesasActualizadas[0].nombre);
        }
        if (!nuevaMesa && mesasActualizadas[0]) {
          setNuevaMesa(mesasActualizadas[0].nombre);
        }
        if (nuevos.length) setBaseVots((prev) => [...prev, ...nuevos]);
        setMensajeImportacion(
          `Importación completada. VOTs: ${importados}. Responsables nuevos: ${responsablesActualizados.length - responsables.length}. Mesas nuevas: ${mesasActualizadas.length - mesas.length}. Errores: ${errores}.`
        );
      } catch (error) {
        setMensajeImportacion(`Error al leer o guardar el Excel: ${firebaseErrorMessage(error)}.`);
      }
    };

    reader.readAsArrayBuffer(file);
    event.target.value = "";
  };

  const crearResponsable = async () => {
    if (!nombreResponsable || !passwordResponsable) return;
    const usuario = nombreResponsable.toLowerCase().split(" ")[0];
    const id = String(Date.now());
    const responsable = {
      id,
      nombre: nombreResponsable,
      telefono: telefonoResponsable,
      usuario,
      password: passwordResponsable,
    };

    try {
      await guardarResponsable(responsable);
    } catch (error) {
      alert(`No se pudo guardar el responsable en Firebase: ${firebaseErrorMessage(error)}`);
      return;
    }

    setResponsables((current) => [
      ...current,
      responsable,
    ]);
    setNombreResponsable("");
    setTelefonoResponsable("");
    setPasswordResponsable("");
  };

  const crearMesa = async () => {
    if (!nombreMesa || !passwordMesa) return;
    const usuario = nombreMesa.toLowerCase().split(" ")[0] + mesas.length;
    const id = String(Date.now());
    const mesa = {
      id,
      nombre: nombreMesa,
      telefono: telefonoMesa,
      usuario,
      password: passwordMesa,
      activo: true,
    };

    try {
      await guardarMesa(mesa);
    } catch (error) {
      alert(`No se pudo guardar la mesa en Firebase: ${firebaseErrorMessage(error)}`);
      return;
    }

    setMesas((current) => [
      ...current,
      mesa,
    ]);
    setNombreMesa("");
    setTelefonoMesa("");
    setPasswordMesa("");
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

        <Card>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-950">Registro rápido por mesa</h2>
              <p className="mt-2 text-slate-600">Selecciona una mesa, introduce el número y marca la entrada.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-[220px_260px_auto]">
              <select
                value={panelMesa}
                onChange={(e) => {
                  setPanelMesa(e.target.value);
                  setPanelNumero("");
                  setPanelMensaje("");
                }}
                className="h-14 rounded-xl border border-slate-200 px-4 text-lg outline-none"
              >
                {mesas.map((mesa) => <option key={mesa.id} value={mesa.nombre}>{mesa.nombre}</option>)}
              </select>
              <input
                value={panelNumero}
                onChange={(e) => setPanelNumero(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && registrarDesdePanel()}
                placeholder="Número"
                className="h-14 rounded-xl border border-slate-200 px-4 text-2xl font-bold outline-none"
              />
              <button onClick={registrarDesdePanel} className="h-14 rounded-xl bg-slate-950 px-8 text-white font-semibold">Marcar</button>
            </div>
          </div>
          <div className="mt-4"><Badge tone={panelMensajeTipo}>{panelMensaje || `${pendientesPanelMesa.length} pendientes en ${panelMesa}`}</Badge></div>

          <div ref={panelMesaTableRef} className="mt-6 max-h-[500px] overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 text-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left">Número</th>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Teléfono</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Colegio</th>
                </tr>
              </thead>
              <tbody>
                {votsPanelMesa.map((vot) => (
                  <tr key={vot.numero} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-lg font-bold">{vot.numero}</td>
                    <td className="px-4 py-3">{vot.nombre}</td>
                    <td className="px-4 py-3">{vot.telefono}</td>
                    <td className="px-4 py-3">{vot.registrada ? <Badge tone="green">Ha entrado</Badge> : <Badge tone="amber">Pendiente</Badge>}</td>
                    <td className="px-4 py-3">{vot.colegio || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-3">
          <Card>
            <h2 className="text-lg font-bold text-slate-950">Alta de VOT</h2>
            <div className="mt-4 space-y-3">
              <input value={nuevoNumero} onChange={(e) => setNuevoNumero(e.target.value)} placeholder="Número" className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none" />
              <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre" className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none" />
              <input value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)} placeholder="Teléfono" className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none" />
              <select value={nuevaMesa} onChange={(e) => setNuevaMesa(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none">
                {mesas.map((mesa) => <option key={mesa.id} value={mesa.nombre}>{mesa.nombre}</option>)}
              </select>
              <input value={nuevoColegio} onChange={(e) => setNuevoColegio(e.target.value)} placeholder="Colegio" className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none" />
              <select value={nuevoResponsableId} onChange={(e) => setNuevoResponsableId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none">
                {responsables.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
              <button onClick={crearVot} className="h-11 w-full rounded-xl bg-slate-950 text-white font-semibold">Crear VOT</button>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-950">Importar Excel</h2>
            <p className="mt-2 text-sm text-slate-500">Columnas: numero, nombre, telefono, mesa, colegio, responsable. Acepta mayúsculas y acentos.</p>
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
            <h2 className="text-lg font-bold text-slate-950">Alta de mesa</h2>
            <div className="mt-4 space-y-3">
              <input value={nombreMesa} onChange={(e) => setNombreMesa(e.target.value)} placeholder="Nombre" className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none" />
              <input value={telefonoMesa} onChange={(e) => setTelefonoMesa(e.target.value)} placeholder="Teléfono" className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none" />
              <input type="password" value={passwordMesa} onChange={(e) => setPasswordMesa(e.target.value)} placeholder="Contraseña" className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none" />
              <button onClick={crearMesa} className="h-11 w-full rounded-xl bg-slate-950 text-white font-semibold">Crear mesa</button>
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="text-lg font-bold text-slate-950">Consulta general</h2>
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-3 md:grid-cols-2 lg:w-[680px]">
              <select
                value={consultaMesa}
                onChange={(e) => setConsultaMesa(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none"
              >
                <option value="">Todas las mesas</option>
                {mesas.map((mesa) => (
                  <option key={mesa.id} value={mesa.nombre}>
                    {mesa.nombre}
                  </option>
                ))}
              </select>
              <select
                value={consultaResponsableId}
                onChange={(e) => setConsultaResponsableId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none"
              >
                <option value="">Todos los responsables</option>
                {responsables.map((responsable) => (
                  <option key={responsable.id} value={responsable.id}>
                    {responsable.nombre}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-sm text-slate-500">
              {votsConsulta.length} de {vots.length} registros
            </span>
          </div>
          <div className="mt-5 max-h-[500px] overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-[1180px] text-sm">
              <thead className="sticky top-0 bg-slate-100 text-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left">Número</th>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Teléfono</th>
                  <th className="px-4 py-3 text-left">Mesa</th>
                  <th className="px-4 py-3 text-left">Hora</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Colegio</th>
                  <th className="px-4 py-3 text-left">Responsable</th>
                </tr>
              </thead>
              <tbody>
                {votsConsulta.map((o) => {
                  const responsable = responsables.find((r) => r.id === o.responsableId);
                  return (
                    <tr key={o.numero} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-semibold">{o.numero}</td>
                      <td className="px-4 py-3">{o.nombre}</td>
                      <td className="px-4 py-3">{o.telefono}</td>
                      <td className="px-4 py-3">{o.mesa}</td>
                      <td className="px-4 py-3">{o.hora || "-"}</td>
                      <td className="px-4 py-3">{o.registrada ? <Badge tone="green">Ha entrado</Badge> : <Badge tone="amber">Falta</Badge>}</td>
                      <td className="px-4 py-3">{o.colegio || "-"}</td>
                      <td className="px-4 py-3">{responsable?.nombre}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function App() {
  const [sesion, setSesion] = useState(readStoredSession);
  const [baseVots, setBaseVots] = useState(votsIniciales);
  const [registros, setRegistros] = useState([]);
  const [responsables, setResponsables] = useState(responsablesIniciales);
  const [mesas, setMesas] = useState(mesasIniciales);
  const [cargando, setCargando] = useState(true);
  const [firebaseError, setFirebaseError] = useState("");
  const vots = applyRegistros(baseVots, registros);

  const handleLogin = (newSession) => {
    setSesion(newSession);
    window.localStorage.setItem(sessionStorageKey, JSON.stringify(newSession));
  };

  const handleLogout = () => {
    setSesion(null);
    window.localStorage.removeItem(sessionStorageKey);
  };

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onSnapshot(
      query(collection(db, collectionNames.registros), orderBy("registradaEn")),
      (snapshot) => {
        if (cancelled) return;
        setRegistros(snapshot.docs.map(withFirestoreId));
        setCargando(false);
      },
      () => {
        setFirebaseError("No se pudo conectar con Firebase. Revisa Firestore y sus reglas.");
        setCargando(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, collectionNames.vots), (snapshot) => {
      const firebaseVots = snapshot.docs.map(withFirestoreId);
      if (firebaseVots.length) setBaseVots(firebaseVots);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, collectionNames.responsables), (snapshot) => {
      const firebaseResponsables = snapshot.docs.map(withFirestoreId);
      if (firebaseResponsables.length) setResponsables(firebaseResponsables);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, collectionNames.mesas), (snapshot) => {
      const firebaseMesas = snapshot.docs.map(withFirestoreId);
      if (firebaseMesas.length) setMesas(firebaseMesas);
    });

    return () => unsubscribe();
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
        <LoginScreen onLogin={handleLogin} responsables={responsables} mesas={mesas} />
      </>
    );
  }

  if (sesion.rol === "mesa") {
    return <MesaScreen onLogout={handleLogout} vots={vots} usuario={sesion.usuario} mesas={mesas} />;
  }

  if (sesion.rol === "responsable") {
    return <ResponsableScreen onLogout={handleLogout} usuario={sesion.usuario} vots={vots} responsables={responsables} />;
  }

  return (
    <PanelControlScreen
      onLogout={handleLogout}
      vots={vots}
      setBaseVots={setBaseVots}
      responsables={responsables}
      setResponsables={setResponsables}
      mesas={mesas}
      setMesas={setMesas}
    />
  );
}
