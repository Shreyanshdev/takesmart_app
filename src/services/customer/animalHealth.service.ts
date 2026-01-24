import { api } from '../core/api';

// Sub-interfaces for nested data
export interface RuminationRecord {
    date: string;
    hours: number;
    threshold: number;
}

export interface DietRecord {
    date: string;
    wheatStraw: number;
    greenFodder: number;
    brokenWheat: number;
    mustardCake: number;
    chickpeaBran: number;
    totalGrainPart: number;
    extraNutrition?: string;
}

export interface MilkQualityRecord {
    date: string;
    fatPercentage?: number;
    snf?: number;
    protein?: number;
}

export interface PhysicalCharacteristics {
    heightCm?: number;
    bodyLengthCm?: number;
    weightKg?: number;
    numberOfHorns?: number;
    visibleCharacteristics?: string;
    colour?: string;
}

export interface CalfInfo {
    gender?: 'male' | 'female';
    dateOfBirth?: string;
    name?: string;
}

export interface ParturitionInfo {
    numberOfParturition?: string;
    ageAtFirstParturitionMonths?: string;
    parturitionIntervalMonths?: string;
}

export interface MilkProductionInfo {
    yieldPerLactationKg?: string;
    averageFatPercentage?: number;
}

export interface HabitsAndPreferences {
    habits?: string;
    likeWeather?: string;
    likeFood?: string;
}

export interface AnimalHealth {
    _id: string;
    productId: string;

    // Know Your Cow - Breed Info
    breedName: string;
    origin?: string;
    mainUse?: string;
    synonyms?: string;
    breedingTract?: string;
    adaptabilityToEnvironment?: string;

    // Animal identification
    animalName?: string;
    animalTag?: string;
    imageUrl?: string;

    // Age
    age?: string;

    // Physical Characteristics
    physicalCharacteristics?: PhysicalCharacteristics;

    // Calf Info
    calfInfo?: CalfInfo;

    // Management
    managementSystem?: 'intensive' | 'semi-intensive' | 'extensive' | 'free-range';
    mobility?: 'stationary' | 'mobile' | 'migratory';
    feedingOfAdults?: string;

    // Parturition Info
    parturitionInfo?: ParturitionInfo;

    // Milk Production Info
    milkProductionInfo?: MilkProductionInfo;

    // Habits and Preferences
    habitsAndPreferences?: HabitsAndPreferences;

    // Cow Health
    healthScore: number;
    lastVetCheckup?: string;
    nextVetCheckup?: string;
    vaccinationStatus: 'up-to-date' | 'due-soon' | 'overdue' | 'unknown';
    vaccinations?: Array<{
        name: string;
        date: string;
        nextDue?: string;
    }>;
    ruminationRecords?: RuminationRecord[];

    // Cow Diet
    dietRecords?: DietRecord[];

    // Milk Quality
    milkQualityRecords?: MilkQualityRecord[];

    // Current Fat and SNF content (displayed in header)
    fatContent?: number;
    snfContent?: number;

    // Process & Companion
    processingInfo?: string;
    companionInfo?: string;

    notes?: string;
    isActive: boolean;
    updatedAt: string;
}

export interface SubscribedProductHealth {
    _id: string;
    name: string;
    breedName?: string;
    animalType?: string;
    image?: string;
    healthRecords: AnimalHealth[];
}

export interface AnimalHealthResponse {
    success: boolean;
    subscribedProducts: SubscribedProductHealth[];
    count: number;
    message?: string;
}

export interface ProductHealthResponse {
    success: boolean;
    product: {
        _id: string;
        name: string;
        breedName?: string;
        animalType?: string;
    };
    healthRecords: AnimalHealth[];
    count: number;
}

export const animalHealthService = {
    /**
     * Get animal health for all subscribed products
     */
    getMySubscribedProductsHealth: async (): Promise<AnimalHealthResponse> => {
        const response = await api.get<AnimalHealthResponse>('animal-health/my-products');
        return response.data;
    },

    /**
     * Get animal health for a specific product
     * User must be subscribed to this product
     */
    getProductHealth: async (productId: string): Promise<ProductHealthResponse> => {
        const response = await api.get<ProductHealthResponse>(`animal-health/product/${productId}`);
        return response.data;
    },
};
