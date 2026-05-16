import React, { useEffect, useState } from "react";
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

const mesasIniciales = [
  { id: "1", nombre: "Mesa 1", usuario: "mesa1", password: "1234", activo: true },
  { id: "2", nombre: "Mesa 2", usuario: "mesa2", password: "1234", activo: true },
];

const votsIniciales = [
  { numero: "001245", nombre: "Luna", telefono: "600000001", mesa: "Mesa 1", responsableId: "1" },
  { numero: "001246", nombre: "Perla", telefono: "600000002", mesa: "Mesa 1", responsableId: "1" },
  { numero: "004112", nombre: "Estrella", telefono: "600000003", mesa: "Mesa 2", responsableId: "2" },
  { numero: "005010", nombre: "Sol", telefono: "600000004", mesa: "Mesa 2", responsableId: "2" },
  { numero: "008921", nombre: "Nieve", telefono: "600000005", mesa: "Mesa 1", responsableId: "3" },
  { numero: "009101", nombre: "Sombra", telefono: "600000006", mesa: "Mesa 2", responsableId: "3" },
];

const collectionNames = {
  registros: "registros",
};

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
  await setDoc(doc(db, collectionNames.registros, vot.numero), {
    numero: vot.numero,
    nombre: vot.nombre,
    telefono: vot.telefono,
    mesaVot: vot.mesa,
    hora,
    registradoPor: origen,
    registradaEn: new Date().toISOString(),
  });
  return hora;
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
  const [mesaSeleccionada, setMesaSeleccionada] = useState(mesaActual?.nombre ?? mesas[0]?.nombre ?? "");
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
            <select
              value={mesaSeleccionada}
              onChange={(e) => {
                setMesaSeleccionada(e.target.value);
                setNumero("");
                setMensaje("");
              }}
              className="h-14 rounded-xl border border-slate-200 px-4 text-lg outline-none"
            >
              {mesas.map((mesa) => <option key={mesa.id} value={mesa.nombre}>{mesa.nombre}</option>)}
            </select>
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

  const total = vots.length;
  const llegadas = vots.filter((o) => o.registrada).length;
  const pendientes = total - llegadas;
  const votsPanelMesa = vots.filter((vot) => vot.mesa === panelMesa);
  const pendientesPanelMesa = votsPanelMesa.filter((vot) => !vot.registrada);

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
      setPanelMensaje("Registrado correctamente desde panel");
      setPanelMensajeTipo("green");
    } catch {
      setPanelMensaje("No se pudo guardar en Firebase");
      setPanelMensajeTipo("red");
    }
  };

  const crearVot = () => {
    if (!nuevoNumero || !nuevoResponsableId || !nuevaMesa) return;
    const numero = nuevoNumero.trim();
    if (vots.some((o) => o.numero === numero)) return;

    setBaseVots((current) => [
      ...current,
      {
        numero,
        nombre: nuevoNombre,
        telefono: nuevoTelefono,
        mesa: nuevaMesa,
        responsableId: String(nuevoResponsableId),
      },
    ]);

    setNuevoNumero("");
    setNuevoNombre("");
    setNuevoTelefono("");
  };

  const importarExcel = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const nombreHoja = workbook.SheetNames[0];
        const hoja = workbook.Sheets[nombreHoja];
        const filas = XLSX.utils.sheet_to_json(hoja);

        let importados = 0;
        let errores = 0;
        const existentes = new Set(vots.map((v) => v.numero));

        const nuevos = [];

        filas.forEach((fila) => {
          const numero = String(fila.numero || fila.referencia || "").trim();
          const nombre = String(fila.nombre || "").trim();
          const telefono = String(fila.telefono || "").trim();
          const mesa = String(fila.mesa || "").trim();
          const nombreResponsable = String(fila.responsable || "").trim().toLowerCase();

          const responsable = responsables.find(
            (r) => r.nombre.trim().toLowerCase() === nombreResponsable
          );

          if (!numero || !mesa || !responsable || existentes.has(numero)) {
            errores += 1;
            return;
          }

          existentes.add(numero);
          nuevos.push({
            numero,
            nombre,
            telefono,
            mesa,
            responsableId: responsable.id,
          });
          importados += 1;
        });

        if (nuevos.length) setBaseVots((prev) => [...prev, ...nuevos]);
        setMensajeImportacion(`Importación completada. Correctos: ${importados}. Errores: ${errores}.`);
      } catch (error) {
        setMensajeImportacion("Error al leer el Excel.");
      }
    };

    reader.readAsArrayBuffer(file);
    event.target.value = "";
  };

  const crearResponsable = () => {
    if (!nombreResponsable || !passwordResponsable) return;
    const usuario = nombreResponsable.toLowerCase().split(" ")[0];
    const id = String(Date.now());
    setResponsables((current) => [
      ...current,
      {
      id,
      nombre: nombreResponsable,
      telefono: telefonoResponsable,
      usuario,
      password: passwordResponsable,
      },
    ]);
    setNombreResponsable("");
    setTelefonoResponsable("");
    setPasswordResponsable("");
  };

  const crearMesa = () => {
    if (!nombreMesa || !passwordMesa) return;
    const usuario = nombreMesa.toLowerCase().split(" ")[0] + mesas.length;
    const id = String(Date.now());
    setMesas((current) => [
      ...current,
      {
      id,
      nombre: nombreMesa,
      telefono: telefonoMesa,
      usuario,
      password: passwordMesa,
      activo: true,
      },
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

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left">Número</th>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Teléfono</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {votsPanelMesa.map((vot) => (
                  <tr key={vot.numero} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-lg font-bold">{vot.numero}</td>
                    <td className="px-4 py-3">{vot.nombre}</td>
                    <td className="px-4 py-3">{vot.telefono}</td>
                    <td className="px-4 py-3">{vot.registrada ? <Badge tone="green">Ha entrado</Badge> : <Badge tone="amber">Pendiente</Badge>}</td>
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
              <select value={nuevoResponsableId} onChange={(e) => setNuevoResponsableId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none">
                {responsables.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
              <button onClick={crearVot} className="h-11 w-full rounded-xl bg-slate-950 text-white font-semibold">Crear VOT</button>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-950">Importar Excel</h2>
            <p className="mt-2 text-sm text-slate-500">Columnas: numero, nombre, telefono, mesa, responsable</p>
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

          <Card>
            <h2 className="text-lg font-bold text-slate-950">Consulta general</h2>
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left">Número</th>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Teléfono</th>
                    <th className="px-4 py-3 text-left">Mesa</th>
                    <th className="px-4 py-3 text-left">Responsable</th>
                    <th className="px-4 py-3 text-left">Hora</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {vots.map((o) => {
                    const responsable = responsables.find((r) => r.id === o.responsableId);
                    return (
                      <tr key={o.numero} className="border-t border-slate-200">
                        <td className="px-4 py-3 font-semibold">{o.numero}</td>
                        <td className="px-4 py-3">{o.nombre}</td>
                        <td className="px-4 py-3">{o.telefono}</td>
                        <td className="px-4 py-3">{o.mesa}</td>
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
  const [baseVots, setBaseVots] = useState(votsIniciales);
  const [registros, setRegistros] = useState([]);
  const [responsables, setResponsables] = useState(responsablesIniciales);
  const [mesas, setMesas] = useState(mesasIniciales);
  const [cargando, setCargando] = useState(true);
  const [firebaseError, setFirebaseError] = useState("");
  const vots = applyRegistros(baseVots, registros);

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
        <LoginScreen onLogin={setSesion} responsables={responsables} mesas={mesas} />
      </>
    );
  }

  if (sesion.rol === "mesa") {
    return <MesaScreen onLogout={() => setSesion(null)} vots={vots} usuario={sesion.usuario} mesas={mesas} />;
  }

  if (sesion.rol === "responsable") {
    return <ResponsableScreen onLogout={() => setSesion(null)} usuario={sesion.usuario} vots={vots} responsables={responsables} />;
  }

  return (
    <PanelControlScreen
      onLogout={() => setSesion(null)}
      vots={vots}
      setBaseVots={setBaseVots}
      responsables={responsables}
      setResponsables={setResponsables}
      mesas={mesas}
      setMesas={setMesas}
    />
  );
}
