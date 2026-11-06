import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import api from '../services/api';
import { colors } from '../theme/colors';

export const AnnouncementsScreen = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data.data || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  const filteredData = announcements.filter((item) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'URGENT') return Boolean(item.isUrgent);
    if (activeFilter === 'EXAM') return item.title?.toLowerCase().includes('exam') || item.message?.toLowerCase().includes('exam');
    return true;
  });

  const renderItem = ({ item }) => {
    return (
      <View style={[styles.card, item.isUrgent && styles.urgentCard]}>
        <View style={styles.headerRow}>
          <View style={styles.courseBadge}>
            <Text style={styles.courseBadgeText}>{item.courseCode || 'DDU ACADEMIC'}</Text>
          </View>
          {item.isUrgent && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentBadgeText}>URGENT NOTICE</Text>
            </View>
          )}
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>

        <View style={styles.footerRow}>
          <Text style={styles.author}>
            By: {item.author?.name || 'Department Faculty'}
          </Text>
          <Text style={styles.date}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {['ALL', 'URGENT', 'EXAM'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === filter && styles.filterChipTextActive,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Announcements</Text>
              <Text style={styles.emptyDesc}>No notices have been published in this category.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: 'bold', color: colors.textMuted },
  filterChipTextActive: { color: '#ffffff' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  urgentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  courseBadgeText: { fontSize: 11, fontWeight: 'bold', color: colors.primary },
  urgentBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  urgentBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#dc2626' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#0b3954', marginBottom: 6 },
  message: { fontSize: 13, color: '#334155', lineHeight: 19, marginBottom: 12 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  author: { fontSize: 11, color: colors.textMuted },
  date: { fontSize: 11, color: colors.textMuted },
  emptyBox: { alignItems: 'center', marginTop: 50 },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', color: colors.text },
  emptyDesc: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
