import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Modal,
} from 'react-native';
import api, { PRIMARY_WIFI_IP } from '../services/api';
import { colors, touchTargets } from '../theme/colors';

export const MaterialsScreen = () => {
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTextMaterial, setActiveTextMaterial] = useState(null);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await api.get('/materials', { params: { search: search.trim() } });
      setMaterials(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleDownload = (matId) => {
    const base = api.defaults.baseURL || `http://${PRIMARY_WIFI_IP}:5000/api`;
    const url = `${base}/materials/${matId}/download`;
    Linking.openURL(url).catch((err) => console.error('Failed to open url', err));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Course Materials Library</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search materials by title or course..."
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={fetchMaterials}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
        ) : materials.length === 0 ? (
          <Text style={styles.emptyText}>No materials found for your assigned department, year, and section.</Text>
        ) : (
          materials.map((m) => (
            <View key={m._id} style={styles.card}>
              <View style={styles.badgeRow}>
                <Text style={styles.courseBadge}>{m.courseCode}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Text style={styles.sectionBadge}>
                    {m.section && m.section !== 'ALL' ? `Sec ${m.section}` : 'All Sections'}
                  </Text>
                  <Text style={[styles.typeBadge, m.materialType === 'text' ? styles.typeTextBadge : styles.typePdfBadge]}>
                    {m.materialType === 'text' ? 'TEXT NOTES' : 'PDF DOC'}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>{m.title}</Text>
              <Text style={styles.cardDesc}>{m.subject}</Text>

              {m.description ? (
                <Text style={styles.materialOverview}>{m.description}</Text>
              ) : null}

              {m.uploadedBy?.name ? (
                <Text style={styles.lecturerInfo}>
                  Uploaded by: {m.uploadedBy.name}
                  {m.uploadedBy.lecturerId ? ` (${m.uploadedBy.lecturerId})` : ''}
                </Text>
              ) : null}

              <View style={styles.actionBtnRow}>
                {m.materialType === 'text' || m.textContent ? (
                  <TouchableOpacity
                    style={[styles.btnAction, styles.readBtn]}
                    onPress={() => setActiveTextMaterial(m)}
                  >
                    <Text style={styles.readBtnText}>Read Lecture Notes</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.btnAction, styles.downloadBtn]}
                  onPress={() => handleDownload(m._id)}
                >
                  <Text style={styles.downloadBtnText}>
                    {m.materialType === 'text' ? 'Download .txt' : 'Download Document'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Text Notes Reader Modal */}
      <Modal
        visible={!!activeTextMaterial}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setActiveTextMaterial(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalCourseCode}>{activeTextMaterial?.courseCode}</Text>
              <Text style={styles.modalTitle}>{activeTextMaterial?.title}</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setActiveTextMaterial(null)}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.modalContentText}>
              {activeTextMaterial?.textContent || 'No text content available.'}
            </Text>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalDownloadBtn}
              onPress={() => {
                if (activeTextMaterial) handleDownload(activeTextMaterial._id);
              }}
            >
              <Text style={styles.modalDownloadBtnText}>Download as File</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 18 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary, marginBottom: 12 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchInput: {
    flex: 1,
    height: touchTargets.minInputHeight,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  searchBtn: {
    height: touchTargets.minInputHeight,
    paddingHorizontal: 16,
    backgroundColor: colors.accent,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: 'bold' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  courseBadge: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    fontWeight: 'bold',
    fontSize: 11,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  sectionBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontWeight: 'bold',
    fontSize: 10,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  typeBadge: {
    fontWeight: 'bold',
    fontSize: 10,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  typePdfBadge: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
  },
  typeTextBadge: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  materialOverview: {
    fontSize: 12,
    color: '#334155',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  lecturerInfo: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 12,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnAction: {
    flex: 1,
    height: touchTargets.minButtonHeight,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readBtn: {
    backgroundColor: '#0284c7',
  },
  readBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  downloadBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.border,
  },
  downloadBtnText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 30, paddingHorizontal: 20 },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#0b3954',
  },
  modalCourseCode: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#93c5fd',
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalCloseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
  },
  modalCloseBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalBody: {
    flex: 1,
    padding: 18,
  },
  modalContentText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#1e293b',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  modalDownloadBtn: {
    height: 46,
    backgroundColor: '#0b3954',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDownloadBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
