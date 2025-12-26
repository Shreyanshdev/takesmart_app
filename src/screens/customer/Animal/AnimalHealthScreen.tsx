import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, Line, Polyline, G, Text as SvgText } from 'react-native-svg';
import { MonoText } from '../../../components/shared/MonoText';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import {
    animalHealthService,
    SubscribedProductHealth,
    AnimalHealth,
} from '../../../services/customer/animalHealth.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 200;
const CHART_PADDING = { top: 20, right: 15, bottom: 40, left: 40 };

type TabType = 'KNOW YOUR COW' | 'COW HEALTH' | 'COW DIET' | 'MILK QUALITY' | 'PROCESS' | 'COMPANION';

const TABS: TabType[] = ['KNOW YOUR COW', 'COW HEALTH', 'COW DIET', 'MILK QUALITY', 'PROCESS', 'COMPANION'];

// Info Row Component - defined outside
const InfoRow = ({ label, value, isLast = false }: { label: string; value?: string; isLast?: boolean }) => (
    <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
        <View style={styles.infoLabelCell}>
            <MonoText size="xs" color={colors.textLight}>{label}</MonoText>
        </View>
        <View style={styles.infoValueCell}>
            <MonoText size="xs" color={colors.text}>{value || '-'}</MonoText>
        </View>
    </View>
);

export const AnimalHealthScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [products, setProducts] = useState<SubscribedProductHealth[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<SubscribedProductHealth | null>(null);
    const [selectedAnimal, setSelectedAnimal] = useState<AnimalHealth | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('KNOW YOUR COW');
    const [error, setError] = useState<string | null>(null);

    // Memoize sorted records at TOP LEVEL - always called
    const sortedRuminationRecords = useMemo(() => {
        if (!selectedAnimal?.ruminationRecords) return [];
        const records = [...selectedAnimal.ruminationRecords];
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return records.slice(0, 30).reverse();
    }, [selectedAnimal?.ruminationRecords]);

    const sortedDietRecords = useMemo(() => {
        if (!selectedAnimal?.dietRecords) return [];
        const records = [...selectedAnimal.dietRecords];
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return records;
    }, [selectedAnimal?.dietRecords]);

    const sortedMilkRecords = useMemo(() => {
        if (!selectedAnimal?.milkQualityRecords) return [];
        const records = [...selectedAnimal.milkQualityRecords];
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return records.slice(0, 30).reverse();
    }, [selectedAnimal?.milkQualityRecords]);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const response = await animalHealthService.getMySubscribedProductsHealth();
            if (response.success) {
                setProducts(response.subscribedProducts);
                if (response.subscribedProducts.length > 0 && !selectedProduct) {
                    setSelectedProduct(response.subscribedProducts[0]);
                    if (response.subscribedProducts[0].healthRecords.length > 0) {
                        setSelectedAnimal(response.subscribedProducts[0].healthRecords[0]);
                    }
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load animal health data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedProduct]);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedProduct?.healthRecords && selectedProduct.healthRecords.length > 0) {
            setSelectedAnimal(selectedProduct.healthRecords[0]);
        } else {
            setSelectedAnimal(null);
        }
    }, [selectedProduct]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const formatShortDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    };

    // ===== KNOW YOUR COW TAB =====
    const renderKnowYourCow = () => {
        if (!selectedAnimal) return null;
        const animal = selectedAnimal;

        return (
            <View style={styles.tabContent}>
                <View style={styles.infoTable}>
                    <InfoRow label="Breed Name" value={animal.breedName} />
                    <InfoRow label="Origin" value={animal.origin} />
                    <InfoRow label="Main Use" value={animal.mainUse} />
                    <InfoRow label="Synonyms" value={animal.synonyms} />
                    <InfoRow label="Breeding Tract" value={animal.breedingTract} />
                    <InfoRow label="Adaptability to Environment" value={animal.adaptabilityToEnvironment} />
                    <InfoRow label="Age" value={animal.age} />
                    <InfoRow label="Colour" value={animal.physicalCharacteristics?.colour} />
                    <InfoRow label="Cow's Calf Gender" value={animal.calfInfo?.gender} />
                    <InfoRow label="Number of Parturition" value={animal.parturitionInfo?.numberOfParturition} />
                    <InfoRow label="Calf's Date of Birth" value={animal.calfInfo?.dateOfBirth ? formatDate(animal.calfInfo.dateOfBirth) : undefined} />
                    <InfoRow label="Number of Horns" value={animal.physicalCharacteristics?.numberOfHorns?.toString()} />
                    <InfoRow label="Visible Characteristics" value={animal.physicalCharacteristics?.visibleCharacteristics} />
                    <InfoRow label="Height (Avg cm)" value={animal.physicalCharacteristics?.heightCm ? `${animal.physicalCharacteristics.heightCm} cm` : undefined} />
                    <InfoRow label="Body Length (Avg cm)" value={animal.physicalCharacteristics?.bodyLengthCm ? `${animal.physicalCharacteristics.bodyLengthCm} cm` : undefined} />
                    <InfoRow label="Weight (Avg Kg)" value={animal.physicalCharacteristics?.weightKg ? `${animal.physicalCharacteristics.weightKg} Kg` : undefined} />
                    <InfoRow label="Management System" value={animal.managementSystem} />
                    <InfoRow label="Mobility" value={animal.mobility} />
                    <InfoRow label="Feeding of Adults" value={animal.feedingOfAdults} />
                    <InfoRow label="Age at First Parturition (Months)" value={animal.parturitionInfo?.ageAtFirstParturitionMonths} />
                    <InfoRow label="Parturition Interval (Months)" value={animal.parturitionInfo?.parturitionIntervalMonths} />
                    <InfoRow label="Milk Yield per Lactation (Kg)" value={animal.milkProductionInfo?.yieldPerLactationKg} />
                    <InfoRow label="Milk Fat (%)" value={animal.milkProductionInfo?.averageFatPercentage ? `Average: ${animal.milkProductionInfo.averageFatPercentage}` : undefined} />
                    <InfoRow label="Habits" value={animal.habitsAndPreferences?.habits} />
                    <InfoRow label="Like Weather" value={animal.habitsAndPreferences?.likeWeather} />
                    <InfoRow label="Like Food" value={animal.habitsAndPreferences?.likeFood} isLast />
                </View>
            </View>
        );
    };

    // ===== COW HEALTH TAB =====
    const renderCowHealth = () => {
        if (!selectedAnimal) return null;

        const records = sortedRuminationRecords;
        const threshold = records[0]?.threshold || 6;
        const maxValue = 10;
        const chartWidth = Math.max(SCREEN_WIDTH - 60, records.length * 30);
        const plotWidth = chartWidth - CHART_PADDING.left - CHART_PADDING.right;
        const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

        // Generate line path
        const linePath = records.length > 0 ? records.map((record, index) => {
            const x = CHART_PADDING.left + (index / Math.max(records.length - 1, 1)) * plotWidth;
            const y = CHART_PADDING.top + plotHeight - (record.hours / maxValue) * plotHeight;
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ') : '';

        const thresholdY = CHART_PADDING.top + plotHeight - (threshold / maxValue) * plotHeight;

        return (
            <View style={styles.tabContent}>
                <View style={styles.chartContainer}>
                    <MonoText size="m" weight="bold">Rumination Hours Analysis</MonoText>
                    <MonoText size="xs" color={colors.textLight} style={{ marginTop: 4 }}>
                        Y-Axis: Hours | X-Axis: Date
                    </MonoText>

                    {records.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: chartWidth }}>
                            <Svg width={chartWidth} height={CHART_HEIGHT}>
                                {/* Y-Axis Labels & Grid */}
                                {[0, 2, 4, 6, 8, 10].map(val => {
                                    const y = CHART_PADDING.top + plotHeight - (val / maxValue) * plotHeight;
                                    return (
                                        <G key={val}>
                                            <SvgText x={CHART_PADDING.left - 8} y={y + 4} fontSize="9" fill="#888" textAnchor="end">{val}</SvgText>
                                            <Line x1={CHART_PADDING.left} y1={y} x2={chartWidth - CHART_PADDING.right} y2={y} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3,3" />
                                        </G>
                                    );
                                })}

                                {/* Threshold Line */}
                                <Line x1={CHART_PADDING.left} y1={thresholdY} x2={chartWidth - CHART_PADDING.right} y2={thresholdY} stroke="#EF4444" strokeWidth="2" />

                                {/* Data Line */}
                                <Path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="2" />

                                {/* Data Points */}
                                {records.map((record, index) => {
                                    const x = CHART_PADDING.left + (index / Math.max(records.length - 1, 1)) * plotWidth;
                                    const y = CHART_PADDING.top + plotHeight - (record.hours / maxValue) * plotHeight;
                                    return <Circle key={index} cx={x} cy={y} r="4" fill={record.hours >= threshold ? '#3B82F6' : '#EF4444'} />;
                                })}

                                {/* X-Axis Labels */}
                                {records.map((record, index) => {
                                    if (index % 4 !== 0 && index !== records.length - 1) return null;
                                    const x = CHART_PADDING.left + (index / Math.max(records.length - 1, 1)) * plotWidth;
                                    return (
                                        <SvgText key={index} x={x} y={CHART_HEIGHT - 5} fontSize="8" fill="#888" textAnchor="middle">
                                            {formatShortDate(record.date)}
                                        </SvgText>
                                    );
                                })}
                            </Svg>
                        </ScrollView>
                    ) : (
                        <View style={styles.noDataBox}><MonoText size="s" color={colors.textLight}>No rumination data</MonoText></View>
                    )}

                    {/* Legend */}
                    <View style={styles.legend}>
                        <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: '#3B82F6' }]} /><MonoText size="xs">Rumination (hrs)</MonoText></View>
                        <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: '#EF4444' }]} /><MonoText size="xs">Threshold ({threshold}hrs)</MonoText></View>
                    </View>

                    {/* Explanation */}
                    <View style={styles.explanationBox}>
                        <MonoText size="xs" color={colors.text}>
                            <MonoText size="xs" weight="bold">Threshold:</MonoText> Minimum healthy rumination time ({threshold} hrs). Red dots = below threshold, may indicate stress.
                        </MonoText>
                    </View>
                </View>

                {/* Health Metrics */}
                <View style={styles.healthMetrics}>
                    <View style={styles.metricCard}>
                        <MonoText size="xs" color={colors.textLight}>Health Score</MonoText>
                        <MonoText size="xl" weight="bold" color={selectedAnimal.healthScore >= 80 ? '#10B981' : '#F59E0B'}>{selectedAnimal.healthScore}</MonoText>
                    </View>
                    <View style={styles.metricCard}>
                        <MonoText size="xs" color={colors.textLight}>Vaccination</MonoText>
                        <MonoText size="s" weight="bold" color={selectedAnimal.vaccinationStatus === 'up-to-date' ? '#10B981' : '#F59E0B'}>
                            {selectedAnimal.vaccinationStatus?.replace('-', ' ').toUpperCase()}
                        </MonoText>
                    </View>
                </View>
            </View>
        );
    };

    // ===== COW DIET TAB =====
    const renderCowDiet = () => {
        const records = sortedDietRecords;

        return (
            <View style={styles.tabContent}>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={styles.dietTable}>
                        <View style={styles.dietHeaderRow}>
                            <View style={[styles.dietCell, styles.dietDateCell]}><MonoText size="xs" weight="bold">Date</MonoText></View>
                            <View style={styles.dietCell}><MonoText size="xs" weight="bold">Wheat Straw</MonoText></View>
                            <View style={styles.dietCell}><MonoText size="xs" weight="bold">Green Fodder</MonoText></View>
                            <View style={styles.dietCell}><MonoText size="xs" weight="bold">Broken Wheat</MonoText></View>
                            <View style={styles.dietCell}><MonoText size="xs" weight="bold">Mustard Cake</MonoText></View>
                            <View style={styles.dietCell}><MonoText size="xs" weight="bold">Chickpea Bran</MonoText></View>
                            <View style={styles.dietCell}><MonoText size="xs" weight="bold">Total Grain</MonoText></View>
                            <View style={styles.dietCell}><MonoText size="xs" weight="bold">Extra</MonoText></View>
                        </View>

                        {records.length > 0 ? records.map((record, index) => (
                            <View key={index} style={[styles.dietRow, index % 2 === 0 && styles.dietRowAlt]}>
                                <View style={[styles.dietCell, styles.dietDateCell]}><MonoText size="xs">{formatDate(record.date)}</MonoText></View>
                                <View style={styles.dietCell}><MonoText size="xs">{record.wheatStraw}</MonoText></View>
                                <View style={styles.dietCell}><MonoText size="xs">{record.greenFodder}</MonoText></View>
                                <View style={styles.dietCell}><MonoText size="xs">{record.brokenWheat}</MonoText></View>
                                <View style={styles.dietCell}><MonoText size="xs">{record.mustardCake}</MonoText></View>
                                <View style={styles.dietCell}><MonoText size="xs">{record.chickpeaBran}</MonoText></View>
                                <View style={styles.dietCell}><MonoText size="xs">{record.totalGrainPart}</MonoText></View>
                                <View style={styles.dietCell}><MonoText size="xs">{record.extraNutrition || '-'}</MonoText></View>
                            </View>
                        )) : (
                            <View style={styles.noDataRow}><MonoText size="s" color={colors.textLight}>No diet records</MonoText></View>
                        )}
                    </View>
                </ScrollView>
            </View>
        );
    };

    // ===== MILK QUALITY TAB =====
    const renderMilkQuality = () => {
        if (!selectedAnimal) return null;

        const records = sortedMilkRecords;
        const minValue = 2.5;
        const maxValue = 7;
        const range = maxValue - minValue;
        const chartWidth = Math.max(SCREEN_WIDTH - 60, records.length * 30);
        const plotWidth = chartWidth - CHART_PADDING.left - CHART_PADDING.right;
        const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

        const linePath = records.length > 0 ? records.map((record, index) => {
            const x = CHART_PADDING.left + (index / Math.max(records.length - 1, 1)) * plotWidth;
            const fatValue = record.fatPercentage || 3.5;
            const y = CHART_PADDING.top + plotHeight - ((fatValue - minValue) / range) * plotHeight;
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ') : '';

        const avgFat = records.length > 0
            ? (records.reduce((sum, r) => sum + (r.fatPercentage || 0), 0) / records.length).toFixed(2)
            : '0';

        return (
            <View style={styles.tabContent}>
                <View style={styles.chartContainer}>
                    <MonoText size="m" weight="bold">Milk Fat Percentage</MonoText>
                    <MonoText size="xs" color={colors.textLight} style={{ marginTop: 4 }}>
                        Y-Axis: Fat % | X-Axis: Date
                    </MonoText>

                    <View style={[styles.legend, { marginVertical: spacing.s }]}>
                        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#1E3A5F' }]} /><MonoText size="xs">Daily avg fat</MonoText></View>
                    </View>

                    {records.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: chartWidth }}>
                            <Svg width={chartWidth} height={CHART_HEIGHT}>
                                {/* Y-Axis Labels & Grid */}
                                {[3.0, 4.0, 5.0, 6.0, 7.0].map(val => {
                                    const y = CHART_PADDING.top + plotHeight - ((val - minValue) / range) * plotHeight;
                                    return (
                                        <G key={val}>
                                            <SvgText x={CHART_PADDING.left - 8} y={y + 4} fontSize="9" fill="#888" textAnchor="end">{val.toFixed(1)}</SvgText>
                                            <Line x1={CHART_PADDING.left} y1={y} x2={chartWidth - CHART_PADDING.right} y2={y} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3,3" />
                                        </G>
                                    );
                                })}

                                {/* Data Line */}
                                <Path d={linePath} fill="none" stroke="#1E3A5F" strokeWidth="2" />

                                {/* Data Points */}
                                {records.map((record, index) => {
                                    const x = CHART_PADDING.left + (index / Math.max(records.length - 1, 1)) * plotWidth;
                                    const fatValue = record.fatPercentage || 3.5;
                                    const y = CHART_PADDING.top + plotHeight - ((fatValue - minValue) / range) * plotHeight;
                                    return <Circle key={index} cx={x} cy={y} r="4" fill="#1E3A5F" />;
                                })}

                                {/* X-Axis Labels */}
                                {records.map((record, index) => {
                                    if (index % 4 !== 0 && index !== records.length - 1) return null;
                                    const x = CHART_PADDING.left + (index / Math.max(records.length - 1, 1)) * plotWidth;
                                    return (
                                        <SvgText key={index} x={x} y={CHART_HEIGHT - 5} fontSize="8" fill="#888" textAnchor="middle">
                                            {formatShortDate(record.date)}
                                        </SvgText>
                                    );
                                })}
                            </Svg>
                        </ScrollView>
                    ) : (
                        <View style={styles.noDataBox}><MonoText size="s" color={colors.textLight}>No milk quality data</MonoText></View>
                    )}

                    {/* Average */}
                    <View style={styles.avgStats}>
                        <MonoText size="xs" color={colors.textLight}>Average Fat:</MonoText>
                        <MonoText size="l" weight="bold" color="#1E3A5F">{avgFat}%</MonoText>
                    </View>
                </View>
            </View>
        );
    };

    // ===== PROCESS TAB =====
    const renderProcess = () => (
        <View style={styles.tabContent}>
            <View style={styles.infoCard}>
                <MonoText size="m" weight="bold" style={{ marginBottom: spacing.m }}>Processing Information</MonoText>
                <MonoText size="s" color={selectedAnimal?.processingInfo ? colors.text : colors.textLight}>
                    {selectedAnimal?.processingInfo || 'No processing information available'}
                </MonoText>
            </View>
        </View>
    );

    // ===== COMPANION TAB =====
    const renderCompanion = () => (
        <View style={styles.tabContent}>
            <View style={styles.infoCard}>
                <MonoText size="m" weight="bold" style={{ marginBottom: spacing.m }}>Companion Information</MonoText>
                <MonoText size="s" color={selectedAnimal?.companionInfo ? colors.text : colors.textLight}>
                    {selectedAnimal?.companionInfo || 'No companion information available'}
                </MonoText>
            </View>
        </View>
    );

    const renderActiveTab = () => {
        if (!selectedAnimal) {
            return <View style={styles.centerState}><MonoText size="s" color={colors.textLight}>No animal data available</MonoText></View>;
        }

        switch (activeTab) {
            case 'KNOW YOUR COW': return renderKnowYourCow();
            case 'COW HEALTH': return renderCowHealth();
            case 'COW DIET': return renderCowDiet();
            case 'MILK QUALITY': return renderMilkQuality();
            case 'PROCESS': return renderProcess();
            case 'COMPANION': return renderCompanion();
            default: return null;
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
                <BlurView style={StyleSheet.absoluteFill} blurType="light" blurAmount={20} reducedTransparencyFallbackColor="white" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2"><Polyline points="15 18 9 12 15 6" /></Svg>
                    </TouchableOpacity>
                    <MonoText size="l" weight="bold">Animal Health</MonoText>
                    <View style={{ width: 40 }} />
                </View>

                {/* Fat & SNF Content Stats - Prominent Header Display */}
                {selectedAnimal && (
                    <View style={styles.milkStatsBar}>
                        <View style={styles.milkStatItem}>
                            <View style={[styles.milkStatIcon, { backgroundColor: '#FEF3C7' }]}>
                                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
                                    <Circle cx="12" cy="12" r="10" />
                                    <Path d="M12 6v6l4 2" />
                                </Svg>
                            </View>
                            <View>
                                <MonoText size="xs" color={colors.textLight}>Fat Content</MonoText>
                                <MonoText size="l" weight="bold" color="#D97706">
                                    {selectedAnimal.fatContent?.toFixed(1) || '0.0'}%
                                </MonoText>
                            </View>
                        </View>
                        <View style={styles.milkStatDivider} />
                        <View style={styles.milkStatItem}>
                            <View style={[styles.milkStatIcon, { backgroundColor: '#DBEAFE' }]}>
                                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </Svg>
                            </View>
                            <View>
                                <MonoText size="xs" color={colors.textLight}>SNF Content</MonoText>
                                <MonoText size="l" weight="bold" color="#2563EB">
                                    {selectedAnimal.snfContent?.toFixed(1) || '0.0'}%
                                </MonoText>
                            </View>
                        </View>
                    </View>
                )}

                {/* Product Dropdown */}
                {products.length > 0 && (
                    <TouchableOpacity style={styles.dropdown} onPress={() => setDropdownOpen(!dropdownOpen)}>
                        {selectedProduct?.image && <Image source={{ uri: selectedProduct.image }} style={styles.dropdownImage} />}
                        <View style={{ flex: 1 }}>
                            <MonoText size="s" weight="bold">{selectedProduct?.name || 'Select Product'}</MonoText>
                            {selectedProduct?.breedName && <MonoText size="xs" color={colors.textLight}>{selectedProduct.breedName}</MonoText>}
                        </View>
                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2">
                            <Polyline points={dropdownOpen ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
                        </Svg>
                    </TouchableOpacity>
                )}

                {dropdownOpen && products.length > 0 && (
                    <View style={styles.dropdownMenu}>
                        {products.map((product) => (
                            <TouchableOpacity key={product._id} style={[styles.dropdownItem, selectedProduct?._id === product._id && styles.dropdownItemActive]}
                                onPress={() => { setSelectedProduct(product); setDropdownOpen(false); }}>
                                {product.image && <Image source={{ uri: product.image }} style={styles.dropdownItemImage} />}
                                <View style={{ flex: 1 }}>
                                    <MonoText size="s" weight={selectedProduct?._id === product._id ? 'bold' : 'regular'}>{product.name}</MonoText>
                                    {product.breedName && <MonoText size="xs" color={colors.textLight}>{product.breedName}</MonoText>}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Tab Bar */}
                {selectedAnimal && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
                        {TABS.map((tab) => (
                            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
                                <MonoText size="xs" weight={activeTab === tab ? 'bold' : 'regular'} color={activeTab === tab ? colors.primary : colors.textLight}>{tab}</MonoText>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* Content */}
            <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing.xl }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
                {loading ? (
                    <View style={styles.centerState}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <MonoText size="s" color={colors.textLight} style={{ marginTop: spacing.m }}>Loading...</MonoText>
                    </View>
                ) : error ? (
                    <View style={styles.centerState}>
                        <MonoText size="m" weight="bold">Something went wrong</MonoText>
                        <MonoText size="s" color={colors.textLight}>{error}</MonoText>
                        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}><MonoText size="s" weight="bold" color={colors.primary}>Retry</MonoText></TouchableOpacity>
                    </View>
                ) : products.length === 0 ? (
                    <View style={styles.centerState}>
                        <MonoText size="m" weight="bold">No Subscriptions Found</MonoText>
                        <MonoText size="s" color={colors.textLight}>Subscribe to products to view animal health</MonoText>
                    </View>
                ) : renderActiveTab()}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    headerContainer: { backgroundColor: 'rgba(255,255,255,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', zIndex: 100 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.m, paddingVertical: spacing.m },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
    dropdown: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.m, marginBottom: spacing.s, padding: spacing.m, backgroundColor: colors.white, borderRadius: 12, gap: 12 },
    dropdownImage: { width: 40, height: 40, borderRadius: 10 },
    dropdownMenu: { marginHorizontal: spacing.m, marginBottom: spacing.s, backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden' },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.m, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    dropdownItemActive: { backgroundColor: colors.primary + '10' },
    dropdownItemImage: { width: 32, height: 32, borderRadius: 8 },
    tabBar: { maxHeight: 50 },
    tabBarContent: { paddingHorizontal: spacing.m, gap: spacing.l },
    tab: { paddingVertical: spacing.s, paddingHorizontal: spacing.s, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: colors.primary },
    content: { flex: 1 },
    contentContainer: { padding: spacing.m },
    centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    retryBtn: { marginTop: spacing.l, paddingHorizontal: spacing.xl, paddingVertical: spacing.m, borderRadius: 12, borderWidth: 1, borderColor: colors.primary },
    tabContent: { flex: 1 },
    infoTable: { backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden' },
    infoRow: { flexDirection: 'row' },
    infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    infoLabelCell: { flex: 1, padding: spacing.m, backgroundColor: '#F9FAFB' },
    infoValueCell: { flex: 2, padding: spacing.m },
    chartContainer: { backgroundColor: colors.white, borderRadius: 12, padding: spacing.m, marginTop: spacing.m },
    noDataBox: { height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', borderRadius: 8 },
    legend: { flexDirection: 'row', gap: spacing.l, marginTop: spacing.m },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    legendDot: { width: 12, height: 12, borderRadius: 6 },
    legendLine: { width: 20, height: 3, borderRadius: 2 },
    explanationBox: { marginTop: spacing.m, padding: spacing.s, backgroundColor: '#FEF3C7', borderRadius: 8 },
    avgStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginTop: spacing.m, padding: spacing.m, backgroundColor: '#F0F9FF', borderRadius: 8 },
    healthMetrics: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.m },
    metricCard: { flex: 1, backgroundColor: colors.white, borderRadius: 12, padding: spacing.m, alignItems: 'center' },
    dietTable: { backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden' },
    dietHeaderRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderBottomWidth: 2, borderBottomColor: '#E5E7EB' },
    dietRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    dietRowAlt: { backgroundColor: '#FAFAFA' },
    dietCell: { width: 80, padding: spacing.s, alignItems: 'center', justifyContent: 'center' },
    dietDateCell: { width: 90, backgroundColor: '#F9FAFB' },
    noDataRow: { padding: spacing.xl, alignItems: 'center' },
    infoCard: { backgroundColor: colors.white, borderRadius: 12, padding: spacing.l },
    // Milk Stats Bar in Header
    milkStatsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: spacing.m,
        marginBottom: spacing.s,
        padding: spacing.m,
        backgroundColor: colors.white,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    milkStatItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s,
    },
    milkStatIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    milkStatDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#E5E7EB',
        marginHorizontal: spacing.m,
    },
});

export default AnimalHealthScreen;
