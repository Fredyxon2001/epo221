/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const VERDE = '#0f4233';
const DORADO = '#d4a73f';

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'Helvetica', color: '#1f2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: VERDE, paddingBottom: 8, marginBottom: 12 },
  brand: { flexDirection: 'row', alignItems: 'center' },
  brandCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: DORADO, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  brandCircleTxt: { color: VERDE, fontSize: 14, fontWeight: 'bold' },
  brandTitle: { fontSize: 13, color: VERDE, fontWeight: 'bold' },
  brandSub: { fontSize: 7, color: '#6b7280' },
  meta: { textAlign: 'right', fontSize: 7, color: '#6b7280' },
  h1: { fontSize: 15, color: VERDE, fontWeight: 'bold', marginBottom: 14, textAlign: 'center', textTransform: 'uppercase' },
  cuerpo: { fontSize: 11, lineHeight: 1.6, textAlign: 'justify', marginBottom: 12 },
  nombreDocente: { fontSize: 13, color: VERDE, fontWeight: 'bold', textAlign: 'center', marginVertical: 6 },
  table: { borderWidth: 1, borderColor: '#d1d5db', marginTop: 8, marginBottom: 10 },
  thead: { flexDirection: 'row', backgroundColor: VERDE },
  th: { padding: 5, fontWeight: 'bold', fontSize: 9, color: 'white', borderRightWidth: 1, borderRightColor: '#0a2e23' },
  tr: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  td: { padding: 4, fontSize: 9, borderRightWidth: 1, borderRightColor: '#e5e7eb' },
  cMat: { flex: 3 },
  cGrupo: { flex: 2, textAlign: 'center' },
  cHoras: { flex: 1, textAlign: 'center' },
  totalRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 5, borderTopWidth: 2, borderTopColor: VERDE },
  totalLabel: { flex: 5, fontWeight: 'bold', fontSize: 10 },
  totalVal: { flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: 10, color: VERDE },
  firmaRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 50 },
  firma: { width: '40%', borderTopWidth: 1, borderTopColor: '#6b7280', paddingTop: 4, textAlign: 'center', fontSize: 9 },
  firmaNom: { fontWeight: 'bold' },
  firmaCargo: { fontSize: 8, color: '#6b7280' },
  footer: { position: 'absolute', bottom: 20, left: 36, right: 36, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#9ca3af' },
  folio: { fontSize: 8, color: '#6b7280', textAlign: 'right', marginBottom: 10 },
});

export function ConstanciaServicioPDF({ profesor, ciclo, cargas, escuela, folio, fecha }: any) {
  const totalHoras = (cargas ?? []).reduce((sum: number, c: any) => sum + Number(c.horas ?? 0), 0);
  const nombreCompleto = `${profesor.nombre} ${profesor.apellido_paterno ?? ''} ${profesor.apellido_materno ?? ''}`.trim();

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
            <Text>CONSTANCIA DE SERVICIO</Text>
            <Text>Emitida: {fecha}</Text>
          </View>
        </View>

        <Text style={s.folio}>Folio: {folio}</Text>

        <Text style={s.h1}>Constancia de servicio docente</Text>

        <Text style={s.cuerpo}>
          La dirección de la {escuela.nombre}, con Clave de Centro de Trabajo {escuela.cct}, por medio del presente documento
          HACE CONSTAR que el/la C.
        </Text>

        <Text style={s.nombreDocente}>{nombreCompleto.toUpperCase()}</Text>

        <Text style={s.cuerpo}>
          con RFC <Text style={{ fontWeight: 'bold' }}>{profesor.rfc ?? '—'}</Text>, presta sus servicios como
          <Text style={{ fontWeight: 'bold' }}> docente frente a grupo </Text>
          en esta institución durante el ciclo escolar <Text style={{ fontWeight: 'bold' }}>{ciclo?.codigo ?? '—'}</Text>
          {ciclo?.periodo ? ` (${ciclo.periodo})` : ''}, atendiendo las siguientes asignaturas y grupos:
        </Text>

        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, s.cMat]}>Asignatura</Text>
            <Text style={[s.th, s.cGrupo]}>Grupo</Text>
            <Text style={[s.th, s.cHoras]}>Horas/sem</Text>
          </View>
          {(cargas ?? []).map((c: any, i: number) => (
            <View key={i} style={s.tr}>
              <Text style={[s.td, s.cMat]}>{c.materia}</Text>
              <Text style={[s.td, s.cGrupo]}>{c.grupo}</Text>
              <Text style={[s.td, s.cHoras]}>{c.horas}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total de horas semanales</Text>
            <Text style={s.totalVal}>{totalHoras}</Text>
          </View>
        </View>

        <Text style={s.cuerpo}>
          Se expide la presente constancia a solicitud del interesado para los fines legales y administrativos que le
          convengan, en {escuela.ciudad ?? 'Tecamachalco, Puebla'}, a {fecha}.
        </Text>

        <View style={s.firmaRow}>
          <View style={{ width: '40%' }}>
            <Text style={s.firma}>
              <Text style={s.firmaNom}>{escuela.director ?? 'Dirección Escolar'}{'\n'}</Text>
              <Text style={s.firmaCargo}>Director(a) del plantel</Text>
            </Text>
          </View>
          <View style={{ width: '40%' }}>
            <Text style={s.firma}>
              <Text style={s.firmaNom}>Control Escolar{'\n'}</Text>
              <Text style={s.firmaCargo}>Subdirección Académica</Text>
            </Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>Documento oficial — requiere sello institucional para ser válido ante terceros.</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
