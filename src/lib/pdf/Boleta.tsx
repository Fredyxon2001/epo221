/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Colores institucionales
const VERDE = '#0f4233';
const DORADO = '#d4a73f';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica', color: '#1f2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: VERDE, paddingBottom: 10, marginBottom: 14 },
  brand: { flexDirection: 'row', alignItems: 'center' },
  brandCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: DORADO, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  brandCircleTxt: { color: VERDE, fontSize: 14, fontWeight: 'bold' },
  brandTitle: { fontSize: 14, color: VERDE, fontWeight: 'bold' },
  brandSub: { fontSize: 8, color: '#6b7280' },
  meta: { textAlign: 'right', fontSize: 8, color: '#6b7280' },
  datosRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  datoLabel: { color: '#6b7280', fontSize: 9 },
  datoVal: { fontWeight: 'bold', fontSize: 9 },
  datosGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  datoCell: { width: '50%', marginBottom: 3, flexDirection: 'row' },
  secHeader: { backgroundColor: VERDE, color: 'white', padding: 4, fontSize: 9, fontWeight: 'bold', marginTop: 8 },
  table: { borderWidth: 1, borderColor: '#d1d5db' },
  tr: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#d1d5db' },
  thead: { flexDirection: 'row', backgroundColor: '#f3f4f6' },
  th: { padding: 4, fontWeight: 'bold', fontSize: 9, borderRightWidth: 1, borderRightColor: '#d1d5db' },
  td: { padding: 4, fontSize: 9, borderRightWidth: 1, borderRightColor: '#d1d5db' },
  tdLast: { padding: 4, fontSize: 9 },
  cMateria: { flex: 3 },
  cNum: { flex: 1, textAlign: 'center' },
  cFinal: { flex: 1, textAlign: 'center', fontWeight: 'bold' },
  resumen: { flexDirection: 'row', marginTop: 16, borderTopWidth: 2, borderTopColor: VERDE, paddingTop: 10 },
  resCell: { flex: 1 },
  resLabel: { fontSize: 8, color: '#6b7280' },
  resValue: { fontSize: 16, fontWeight: 'bold', color: VERDE },
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#9ca3af' },
});

type HistorialRow = {
  ciclo: string;
  semestre: number;
  materia: string;
  p1: number | null;
  p2: number | null;
  p3: number | null;
  e1: number | null;
  e2: number | null;
  e3: number | null;
  e4: number | null;
  promedio_final: number | null;
};

type Eval = {
  promedio_general: number | null;
  total_aprobadas: number;
  total_materias: number;
  porcentaje_avance: number;
};

type Alumno = {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  curp: string;
  matricula: string | null;
  generacion: string | null;
};

type Escuela = {
  nombre: string;
  cct: string;
};

export function BoletaPDF({
  alumno, historial, evaluacion, escuela,
}: {
  alumno: Alumno;
  historial: HistorialRow[];
  evaluacion: Eval | null;
  escuela: Escuela;
}) {
  // Agrupar por ciclo+semestre
  const grupos: Record<string, HistorialRow[]> = {};
  for (const r of historial) {
    const k = `${r.ciclo} · ${r.semestre}° Semestre`;
    (grupos[k] ??= []).push(r);
  }

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.brandCircle}>
              <Text style={styles.brandCircleTxt}>221</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>{escuela.nombre}</Text>
              <Text style={styles.brandSub}>CCT {escuela.cct} · Bachillerato General Estatal</Text>
            </View>
          </View>
          <View style={styles.meta}>
            <Text>Boleta de calificaciones</Text>
            <Text>Emitida: {new Date().toLocaleDateString('es-MX')}</Text>
          </View>
        </View>

        {/* Datos del alumno */}
        <View style={styles.datosGrid}>
          <Dato k="Alumno" v={`${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno ?? ''}`} />
          <Dato k="CURP" v={alumno.curp} />
          <Dato k="Matrícula" v={alumno.matricula ?? '—'} />
          <Dato k="Generación" v={alumno.generacion ?? '—'} />
        </View>

        {/* Secciones por ciclo */}
        {Object.entries(grupos).map(([titulo, materias]) => (
          <View key={titulo} wrap={false}>
            <Text style={styles.secHeader}>{titulo}</Text>
            <View style={styles.table}>
              <View style={styles.thead}>
                <Text style={[styles.th, styles.cMateria]}>Asignatura</Text>
                <Text style={[styles.th, styles.cNum]}>P1</Text>
                <Text style={[styles.th, styles.cNum]}>P2</Text>
                <Text style={[styles.th, styles.cNum]}>P3</Text>
                <Text style={[styles.th, styles.cNum]}>Ext.</Text>
                <Text style={[styles.tdLast, styles.cFinal, { fontWeight: 'bold' }]}>Final</Text>
              </View>
              {materias.map((m, i) => {
                const extras = [m.e1, m.e2, m.e3, m.e4].filter((x): x is number => !!x && x > 0);
                const ext = extras.length ? Math.max(...extras) : null;
                return (
                  <View key={i} style={styles.tr}>
                    <Text style={[styles.td, styles.cMateria]}>{m.materia}</Text>
                    <Text style={[styles.td, styles.cNum]}>{m.p1 ?? '—'}</Text>
                    <Text style={[styles.td, styles.cNum]}>{m.p2 ?? '—'}</Text>
                    <Text style={[styles.td, styles.cNum]}>{m.p3 ?? '—'}</Text>
                    <Text style={[styles.td, styles.cNum]}>{ext ?? '—'}</Text>
                    <Text style={[styles.tdLast, styles.cFinal]}>
                      {m.promedio_final != null ? Number(m.promedio_final).toFixed(2) : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Resumen */}
        <View style={styles.resumen}>
          <View style={styles.resCell}>
            <Text style={styles.resLabel}>Promedio general</Text>
            <Text style={styles.resValue}>
              {evaluacion?.promedio_general != null ? Number(evaluacion.promedio_general).toFixed(2) : '—'}
            </Text>
          </View>
          <View style={styles.resCell}>
            <Text style={styles.resLabel}>Materias aprobadas</Text>
            <Text style={styles.resValue}>
              {evaluacion?.total_aprobadas ?? 0} / {evaluacion?.total_materias ?? 0}
            </Text>
          </View>
          <View style={styles.resCell}>
            <Text style={styles.resLabel}>Avance</Text>
            <Text style={styles.resValue}>{evaluacion?.porcentaje_avance ?? 0}%</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>Documento informativo. No sustituye documento oficial emitido por Control Escolar.</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.datoCell}>
      <Text style={styles.datoLabel}>{k}: </Text>
      <Text style={styles.datoVal}>{v}</Text>
    </View>
  );
}
