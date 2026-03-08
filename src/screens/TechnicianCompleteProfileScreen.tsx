import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Modal,
    FlatList,
    KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Ionicons, Feather } from '@expo/vector-icons';
import CustomInput from '../components/CustomInput';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TechnicianCompleteProfileScreenProps {
    authToken: string;
    userId: number;
    onSuccess: () => void;
}

interface Region {
    id: number;
    nameAr: string;
    nameEn: string;
}

export default function TechnicianCompleteProfileScreen({
    authToken,
    userId,
    onSuccess
}: TechnicianCompleteProfileScreenProps) {
    const { t, i18n } = useTranslation();
    const { colors, theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const isRTL = i18n.language.startsWith('ar');

    // Form State
    const [email, setEmail] = useState('');
    const [bio, setBio] = useState('');
    const [address, setAddress] = useState('');
    const [yearsOfExperience, setYearsOfExperience] = useState('');
    const [selectedRegions, setSelectedRegions] = useState<number[]>([]);
    const [certificates, setCertificates] = useState<ImagePicker.ImagePickerAsset[]>([]);

    // UI State
    const [loading, setLoading] = useState(false);
    const [fetchingRegions, setFetchingRegions] = useState(false);
    const [regions, setRegions] = useState<Region[]>([]);
    const [showRegionsModal, setShowRegionsModal] = useState(false);
    const [showExperienceModal, setShowExperienceModal] = useState(false);

    // Errors
    const [errors, setErrors] = useState({
        email: '',
        bio: '',
        address: '',
        yearsOfExperience: '',
        regions: '',
        certificates: '',
    });

    useEffect(() => {
        fetchRegions();
    }, []);

    const fetchRegions = async () => {
        try {
            setFetchingRegions(true);
            const response = await fetch(buildApiUrl(API_ENDPOINTS.ZONES.LIST), {
                headers: { 'Accept-Language': i18n.language }
            });
            const data = await response.json();
            if (response.ok) { // Adjust based on API structure, sometimes data.data or data directly
                // Assuming data is array or data.data is array
                setRegions(Array.isArray(data) ? data : data.data || []);
            }
        } catch (error) {
            console.error('Error fetching regions:', error);
        } finally {
            setFetchingRegions(false);
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true, // Allow multiple if native support
                quality: 0.8,
            });

            if (!result.canceled) {
                setCertificates(prev => [...prev, ...result.assets]);
                setErrors(prev => ({ ...prev, certificates: '' }));
            }
        } catch (error) {
            Alert.alert(t('Error'), t('Failed to pick image'));
        }
    };

    const removeImage = (index: number) => {
        setCertificates(prev => prev.filter((_, i) => i !== index));
    };

    const validate = () => {
        let isValid = true;
        const newErrors = { ...errors };

        if (!email || !email.includes('@')) {
            newErrors.email = t('Please enter a valid email');
            isValid = false;
        } else {
            newErrors.email = '';
        }

        if (!bio || bio.length < 10) {
            newErrors.bio = t('Bio must be at least 10 characters');
            isValid = false;
        } else {
            newErrors.bio = '';
        }

        if (!address) {
            newErrors.address = t('Address is required');
            isValid = false;
        } else {
            newErrors.address = '';
        }

        if (!yearsOfExperience) {
            newErrors.yearsOfExperience = t('Years of experience is required');
            isValid = false;
        } else {
            newErrors.yearsOfExperience = '';
        }

        if (selectedRegions.length === 0) {
            newErrors.regions = t('Please select at least one region');
            isValid = false;
        } else {
            newErrors.regions = '';
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('email', email);
            formData.append('description', bio);
            formData.append('address', address);
            formData.append('yearsOfExperience', yearsOfExperience);

            selectedRegions.forEach(id => {
                formData.append('regionIds', String(id));
            });

            certificates.forEach((cert, index) => {
                // @ts-ignore
                formData.append('certificates', {
                    uri: cert.uri,
                    type: 'image/jpeg', // Infer type if possible, fallback to jpeg
                    name: `cert_${index}.jpg`,
                });
            });

            const response = await fetch(buildApiUrl(API_ENDPOINTS.USER.COMPLETE_PROFILE), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || t('Failed to complete profile'));
            }

            Alert.alert(t('Success'), t('Profile completed successfully!'), [
                { text: t('OK'), onPress: onSuccess }
            ]);

        } catch (error: any) {
            Alert.alert(t('Error'), error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleRegion = (id: number) => {
        setSelectedRegions(prev =>
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        );
    };

    const getSelectedRegionsText = () => {
        if (selectedRegions.length === 0) return '';
        const selectedNames = regions
            .filter(r => selectedRegions.includes(r.id))
            .map(r => isRTL ? r.nameAr : r.nameEn);
        return selectedNames.join(', ');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>{t('Complete Your Profile')}</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('Please provide additional details to verify your account.')}</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>

                        <CustomInput
                            label={t('Email')}
                            value={email}
                            onChangeText={setEmail}
                            placeholder={t('Enter your email')}
                            keyboardType="email-address"
                            error={errors.email}
                            autoCapitalize="none"
                            icon="mail"
                        />

                        <CustomInput
                            label={t('Bio / Description')}
                            value={bio}
                            onChangeText={setBio}
                            placeholder={t('Tell us about your services...')}
                            multiline
                            numberOfLines={4}
                            error={errors.bio}
                            icon="file-text"
                        />

                        <CustomInput
                            label={t('Address')}
                            value={address}
                            onChangeText={setAddress}
                            placeholder={t('Your specific address')}
                            error={errors.address}
                            icon="map-pin"
                        />

                        {/* Regions Dropdown Trigger */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>{t('Regions')}</Text>
                            <TouchableOpacity
                                style={[styles.dropdownButton, { borderColor: errors.regions ? 'red' : colors.border, backgroundColor: colors.surface }]}
                                onPress={() => setShowRegionsModal(true)}
                            >
                                <Text style={{ color: selectedRegions.length ? colors.text : colors.textSecondary, flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                                    {getSelectedRegionsText() || t('Select Regions')}
                                </Text>
                                <Feather name="chevron-down" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                            {errors.regions ? <Text style={styles.errorText}>{errors.regions}</Text> : null}
                        </View>

                        {/* Experience Dropdown Trigger */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>{t('Years of Experience')}</Text>
                            <TouchableOpacity
                                style={[styles.dropdownButton, { borderColor: errors.yearsOfExperience ? 'red' : colors.border, backgroundColor: colors.surface }]}
                                onPress={() => setShowExperienceModal(true)}
                            >
                                <Text style={{ color: yearsOfExperience ? colors.text : colors.textSecondary, flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                                    {yearsOfExperience ? `${yearsOfExperience} ${t('Years')}` : t('Select Experience')}
                                </Text>
                                <Feather name="chevron-down" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                            {errors.yearsOfExperience ? <Text style={styles.errorText}>{errors.yearsOfExperience}</Text> : null}
                        </View>

                        {/* Certificates Upload */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>{t('Certificates / Licenses')}</Text>
                            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                                <Feather name="upload" size={20} color="#00549B" />
                                <Text style={styles.uploadText}>{t('Upload Images')}</Text>
                            </TouchableOpacity>

                            <View style={styles.certsContainer}>
                                {certificates.map((cert, index) => (
                                    <View key={index} style={styles.certThumb}>
                                        <Image source={{ uri: cert.uri }} style={styles.certImage} />
                                        <TouchableOpacity style={styles.removeCert} onPress={() => removeImage(index)}>
                                            <Ionicons name="close-circle" size={20} color="red" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[styles.submitButton, loading && styles.disabledButton]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>{t('Submit Profile')}</Text>
                            )}
                        </TouchableOpacity>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Regions Modal */}
            <Modal visible={showRegionsModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('Select Regions')}</Text>
                            <TouchableOpacity onPress={() => setShowRegionsModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        {fetchingRegions ? (
                            <ActivityIndicator size="large" color={colors.primary} />
                        ) : (
                            <FlatList
                                data={regions}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.regionItem, selectedRegions.includes(item.id) && { backgroundColor: colors.primary + '20' }]}
                                        onPress={() => toggleRegion(item.id)}
                                    >
                                        <Text style={[styles.regionText, { color: colors.text }]}>{isRTL ? item.nameAr : item.nameEn}</Text>
                                        {selectedRegions.includes(item.id) && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                        <TouchableOpacity style={styles.modalDoneButton} onPress={() => setShowRegionsModal(false)}>
                            <Text style={styles.modalDoneText}>{t('Done')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Experience Modal */}
            <Modal visible={showExperienceModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('Select Years of Experience')}</Text>
                            <TouchableOpacity onPress={() => setShowExperienceModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={Array.from({ length: 30 }, (_, i) => (i + 1).toString())}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.regionItem}
                                    onPress={() => {
                                        setYearsOfExperience(item);
                                        setShowExperienceModal(false);
                                    }}
                                >
                                    <Text style={[styles.regionText, { color: colors.text }]}>{item} {t('Years')}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20 },
    header: { marginBottom: 24, alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
    subtitle: { fontSize: 14, textAlign: 'center' },
    form: { gap: 16 },
    inputContainer: { marginBottom: 16 },
    label: { marginBottom: 8, fontSize: 14, fontWeight: '500' },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        minHeight: 50,
    },
    errorText: { color: 'red', fontSize: 12, marginTop: 4 },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#00549B',
        borderStyle: 'dashed',
        borderRadius: 8,
        gap: 8,
    },
    uploadText: { color: '#00549B', fontWeight: '500' },
    certsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    certThumb: { position: 'relative', width: 80, height: 80 },
    certImage: { width: '100%', height: '100%', borderRadius: 8 },
    removeCert: { position: 'absolute', top: -5, right: -5, backgroundColor: '#fff', borderRadius: 10 },
    submitButton: {
        backgroundColor: '#00549B',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 24,
    },
    disabledButton: { opacity: 0.7 },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { height: '50%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    regionItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
    regionText: { fontSize: 16 },
    modalDoneButton: { marginTop: 16, backgroundColor: '#00549B', padding: 12, borderRadius: 8, alignItems: 'center' },
    modalDoneText: { color: '#fff', fontWeight: 'bold' },
});
