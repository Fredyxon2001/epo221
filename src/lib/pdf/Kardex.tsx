/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const VERDE = '#0f4233';
const DORADO = '#d4a73f';

const s = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: 'Helvetica', color: '#1f2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: VERDE, paddingBottom: 8, marginBottom: 10 },
  brand: { flexDirection: 'row', alignItems: 'center' },
  brandCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: DORADO, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  brandCircleTxt: { color: VERDE, fontSize: 13, fontWeight: 'bold' },
  brandTitle: { fontSize: 13, color: VERDE, fontWeight: 'bold' },
  brandSub: { fontSize: 7, color: '#6b7280' },
  meta: { textAlign: 'right', fontSize: 7, color: '#6b7280' },
  h1: { fontSize: 14, color: VERDE, fontWeight: 'bold', marginBottom: 6, textAlign: 'center', textTransform: 'uppercase' },
  datosGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 6, borderRadius: 3 },
  datoCell: { width: '50%', marginBottom: 2, flexDirection: 'row' },
  datoLabel: { color: '#6b7280', fontSize: 8 },
  datoVal: { fontWeight: 'bold', fontSize: 8 },
  secHeader: { backgroundColor: VERDE, color: 'white', padding: 4, fontSize: 9, fontWeight: 'bold', marginTop: 6, marginBottom: 4 },
  table: { borderWidth: 1, borderColor: '#d1d5db', marginBottom: 4 },
  tr: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#d1d5db' },
  thead: { flexDirection: 'row', backgroundColor: '#f3f4f6' },
  th: { padding: 3, fontWeight: 'bold', fontSize: 8, borderRightWidth: 1, borderRightColor: '#d1d5db' },
  td: { padding: 3, fontSize: 8, borderRightWidth: 1, borderRightColor: '#d1d5db' },
  tdLast: { padding: 3, fontSize: 8 },
  cMat: { flex: 3 },
  cNum: { flex: 1, textAlign: 'center' },
  cTxt: { flex: 2 },
  resumen: { flexDirection: 'row', marginTop: 8, padding: 6, backgroundColor: '#f9fafb', borderRadius: 3 },
  resCell: { flex: 1 },
  resLabel: { fontSize: 7, color: '#6b7280' },
  resValue: { fontSize: 13, fontWeight: 'bold', color: VERDE },
  footer: { position: 'absolute', bottom: 18, left: 28, right: 28, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#9ca3af' },
  firmaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  firma: { width: '42%', borderTopWidth: 1, borderTopColor: '#9ca3af', paddingTop: 3, textAlign: 'center', fontSize: 8 },
});

export function KardexPDF({ alumno, historial, evaluacion, escuela, extras }: any) {
  const grupos: Record<string, any[]> = {};
  for (const r of historial ?? []) {
    const k = `${r.ciclo} · ${r.semestre}° Semestre`;
    (grupos[k] ??= []).push(r);
  }

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View style={s.brand}>
            <View style={s.brandCircle}><Text style={s.brandCircleTxt}>221</Text></View>
            <View>
              <Text style={s.brandTitle}>{escuela.nombre}</Text>
              <Text style={s.brandSub}>CCT {escuela.cct} · Bachillerato General Estatal</Text>
            </View>
          </View>
          <View style={s.meta}>
            <Text>KARDEX ACADÉMICO</Text>
            <Text>Emitido: {new Date().toLocaleDateString('es-MX')}</Text>
          </View>
        </View>

        <Text style={s.h1}>Kardex integral del alumno</Text>

        <View style={s.datosGrid}>
          <D k="Nombre" v={`${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno ?? ''}`} />
          <D k="CURP" v={alumno.curp} />
          <D k="Matrícula" v={alumno.matricula ?? '—'} />
          <D k="Generación" v={alumno.generacion ?? '—'} />
          <D k="Correo" v={alumno.email ?? '—'} />
          <D k="Tel. contacto" v={alumno.telefono ?? '—'} />
          <D k="Tutor" v={alumno.tutor_nombre ?? '—'} />
          <D k="Tel. tutor" v={alumno.tutor_telefono ?? '—'} />
        </View>

        {Object.entries(grupos).map(([titulo, materias]) => (
          <View key={titulo} wrap={false}>
            <Text style={s.secHeader}>{titulo}</Text>
            <View style={s.table}>
              <View style={s.thead}>
                <Text style={[s.th, s.cMat]}>Asignatura</Text>
                <Text style={[s.th, s.cNum]}>P1</Text>
                <Text style={[s.th, s.cNum]}>P2</Text>
                <Text style={[s.th, s.cNum]}>P3</Text>
                <Text style={[s.th, s.cNum]}>Ext1</Text>
                <Text style={[s.th, s.cNum]}>Ext2</Text>
                <Text style={[s.tdLast, s.cNum, { fontWeight: 'bold' }]}>Final</Text>
              </View>
              {materias.map((m: any, i: number) => (
                <View key={i} style={s.tr}>
                  <Text style={[s.td, s.cMat]}>{m.materia}</Text>
                  <Text style={[s.td, s.cNum]}>{m.p1 ?? '—'}</Text>
                  <Text style={[s.td, s.cNum]}>{m.p2 ?? '—'}</Text>
                  <Text style={[s.td, s.cNum]}>{m.p3 ?? '—'}</Text>
                  <Text style={[s.td, s.cNum]}>{m.e1 ?? '—'}</Text>
                  <Text style={[s.td, s.cNum]}>{m.e2 ?? '—'}</Text>
                  <Text style={[s.tdLast, s.cNum, { fontWeight: 'bold' }]}>
                    {m.promedio_final != null ? Number(m.promedio_final).toFixed(2) : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={s.resumen}>
          <View style={s.resCell}>
            <Text style={s.resLabel}>Promedio general</Text>
            <Text style={s.resValue}>{evaluacion?.promedio_general != null ? Number(evaluacion.promedio_general).toFixed(2) : '—'}</Text>
          </View>
          <View style={s.resCell}>
            <Text style={s.resLabel}>Aprobadas</Text>
            <Text style={s.resValue}>{evaluacion?.total_aprobadas ?? 0}/{evaluacion?.total_materias ?? 0}</Text>
          </View>
          <View style={s.resCell}>
            <Text style={s.resLabel}>Avance</Text>
            <Text style={s.resValue}>{evaluacion?.porcentaje_avance ?? 0}%</Text>
          </View>
          <View style={s.resCell}>
            <Text style={s.resLabel}>Reconocimientos</Text>
            <Text style={s.resValue}>{extras?.reconocimientos ?? 0}</Text>
          </View>
          <View style={s.resCell}>
            <Text style={s.resLabel}>Reportes conducta</Text>
            <Text style={s.resValue}>{extras?.conductaNeg ?? 0}</Text>
          </View>
        </View>

        {extras?.reportes?.length > 0 && (
          <View>
            <Text style={s.secHeader}>Historial de conducta</Text>
            <View style={s.table}>
              <View style={s.thead}>
                <Text style={[s.th, s.cNum]}>Fecha</Text>
                <Text style={[s.th, s.cNum]}>Tipo</Text>
                <Text style={[s.th, s.cMat]}>Categoría</Text>
                <Text style={[s.tdLast, s.cTxt]}>Descripción</Text>
              </View>
              {extras.reportes.slice(0, 15).map((r: any, i: number) => (
                <View key={i} style={s.tr}>
                  <Text style={[s.td, s.cNum]}>{r.fecha}</Text>
                  <Text style={[s.td, s.cNum]}>{r.tipo}</Text>
                  <Text style={[s.td, s.cMat]}>{r.categoria}</Text>
                  <Text style={[s.tdLast, s.cTxt]}>{String(r.descripcion ?? '').slice(0, 80)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={s.firmaRow}>
          <Text style={s.firma}>Control Escolar</Text>
          <Text style={s.firma}>Dirección</Text>
        </View>

        <View style={s.footer} fixed>
          <Text>Kardex informativo. Documento oficial requiere sello y firma de Control Escolar.</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function D({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.datoCell}>
      <Text style={s.datoLabel}>{k}: </Text>
      <Text style={s.datoVal}>{v}</Text>
    </View>
  );
}
