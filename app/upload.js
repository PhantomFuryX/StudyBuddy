import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { uploadPDF, getUploadStatus } from '../utils/api';

const colors = {
  primary: '#6C63FF',
  background: '#F8F9FE',
  surface: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#666687',
  gradientPrimary: ['#6C63FF', '#8B85FF'],
  gradientSuccess: ['#4CAF50', '#81C784'],
};

const QUESTION_COUNT_OPTIONS = [5, 10, 20, 30, 50, 75, 100];

export default function UploadScreen() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [jobId, setJobId] = useState(null);
  const [statusModal, setStatusModal] = useState(false);
  const [jobStatus, setJobStatus] = useState({ status: 'queued', extracted: 0, added: 0, message: '' });
  const pollRef = React.useRef(null);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType,
        });
      }
    } catch (error) {
      console.log('Document picker error:', error);
      Alert.alert('Error', 'Failed to select document. Please try again.');
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('No file', 'Please select a PDF file to upload.');
      return;
    }

    setUploading(true);

    try {
      const result = await uploadPDF(
        selectedFile.uri,
        selectedFile.name,
        questionCount,
        'medium'
      );
      if (result?.job_id) {
        setJobId(result.job_id);
        setStatusModal(true);
        // start polling
        const poll = async () => {
          try {
            const s = await getUploadStatus(result.job_id);
            setJobStatus({
              status: s.status,
              extracted: s.extracted ?? 0,
              added: s.added ?? 0,
              message: s.message || '',
            });
            if (s.status === 'done') {
              clearInterval(pollRef.current);
              setUploading(false);
              setTimeout(() => {
                setStatusModal(false);
                Alert.alert('Completed', 'Questions added to your bank.', [
                  { text: 'OK', onPress: () => router.replace('/quiz-config') }
                ]);
              }, 300);
            } else if (s.status === 'error') {
              clearInterval(pollRef.current);
              setUploading(false);
              setTimeout(() => {
                setStatusModal(false);
                Alert.alert('Upload failed', s.message || 'Processing error');
              }, 300);
            }
          } catch {}
        };
        pollRef.current = setInterval(poll, 1500);
        // initial call
        await poll();
      } else if (result?.success) {
        // Fallback: immediate result
        Alert.alert('Uploaded', result.message || 'Processing started.');
      }
    } catch (error) {
      Alert.alert('Upload failed', 'Please check your connection and try again.');
      console.log('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.gradientPrimary} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Study Material</Text>
        <Text style={styles.headerSubtitle}>
          Upload previous year papers. We’ll extract all questions.
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <TouchableOpacity style={styles.uploadCard} onPress={pickDocument}>
          <View style={[styles.iconCircle, { backgroundColor: '#E8E6FF' }]}>
            <Ionicons name="document-text" size={48} color={colors.primary} />
          </View>
          <Text style={styles.uploadTitle}>Select PDF Document</Text>
          <Text style={styles.uploadDesc}>Tap to choose a PDF file from your device</Text>
        </TouchableOpacity>

        {selectedFile && (
          <View style={styles.selectedSection}>
            <Text style={styles.sectionTitle}>Selected File</Text>
            
            <View style={styles.fileItem}>
              <View style={[styles.fileThumb, styles.docThumb]}>
                <Ionicons name="document" size={24} color={colors.primary} />
              </View>
              
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                {selectedFile.size && (
                  <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text>
                )}
              </View>
              
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={removeFile}
              >
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Question count removed: backend stores all detected questions */}

        {selectedFile && (
          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.uploadButtonText}>Processing...</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>
                  Upload & Extract Questions
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Tips for best results</Text>
          <Text style={styles.tipItem}>• Ensure PDF text is clear and readable</Text>
            <Text style={styles.tipItem}>• Upload complete sections or full papers</Text>
            <Text style={styles.tipItem}>• Clear section headers help auto-categorize</Text>
        </View>

        {/* Status Modal */}
        <Modal visible={statusModal} transparent animationType="fade" onRequestClose={() => setStatusModal(false)}>
          <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' }}>
            <View style={{ backgroundColor:'#fff', width:'85%', borderRadius:16, padding:20 }}>
              <Text style={{ fontSize:18, fontWeight:'700', marginBottom:8 }}>Processing PDF...</Text>
              <Text style={{ color:'#666', marginBottom:12 }}>{jobStatus.message || jobStatus.status}</Text>
              <View style={{ height:8, backgroundColor:'#eee', borderRadius:4, overflow:'hidden', marginBottom:8 }}>
                <View style={{ width: jobStatus.status==='done' ? '100%' : '50%', height:'100%', backgroundColor:'#6C63FF' }} />
              </View>
              <Text style={{ fontSize:12, color:'#666' }}>Extracted: {jobStatus.extracted} • Added: {jobStatus.added}</Text>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 100,
  },
  uploadCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E8E6FF',
    borderStyle: 'dashed',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  uploadDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  selectedSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  fileThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F0F0F5',
  },
  docThumb: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  fileSize: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  removeBtn: {
    padding: 4,
  },
  questionCountSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  questionCountValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F5',
    minWidth: 48,
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: colors.primary,
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetButtonTextActive: {
    color: '#fff',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  tipsCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFE599',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  tipItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
  },
});
