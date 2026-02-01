import { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, Image, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Camera, X, Image as ImageIcon, Zap, RotateCcw, Sparkles } from "lucide-react-native";
import { colors } from "@/constants/colors";

export default function PantryScanScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Request permission on mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      if (photo?.uri) {
        setSelectedPhoto(photo.uri);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setSelectedPhoto(result.assets[0].uri);
    }
  };

  const handleClearPhoto = () => {
    setSelectedPhoto(null);
  };

  const handleProcess = () => {
    if (!selectedPhoto) {
      Alert.alert('No Photo', 'Please capture or select a photo first');
      return;
    }

    // Navigate to review screen with photo
    router.push({
      pathname: '/pantry/review',
      params: { photos: JSON.stringify([selectedPhoto]) },
    });
  };

  // Permission not granted
  if (!permission?.granted) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center px-6">
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: colors.honey[50] }}
          >
            <Camera size={48} color={colors.honey[400]} strokeWidth={1.5} />
          </View>
          <Text style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: colors.text.primary, textAlign: 'center', marginBottom: 12 }}>
            Camera Access Needed
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.text.tertiary, textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
            To scan your pantry items, we need access to your camera. Your photos are processed locally and never stored.
          </Text>
          <Pressable
            onPress={requestPermission}
            className="px-8 py-4 rounded-xl active:opacity-90"
            style={{ backgroundColor: colors.sage[200] }}
          >
            <Text style={{ color: 'white', fontFamily: 'Inter', fontWeight: '600', fontSize: 16 }}>
              Grant Camera Access
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            className="mt-4 px-6 py-3"
          >
            <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 15 }}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Photo selected - show preview mode
  if (selectedPhoto) {
    return (
      <SafeAreaView className="flex-1 bg-stone-900" edges={["top", "bottom"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <Pressable
            onPress={handleClearPhoto}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <ArrowLeft size={20} color="white" strokeWidth={2} />
          </Pressable>
          <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '500', color: 'white' }}>
            Review Photo
          </Text>
          <Pressable
            onPress={handleClearPhoto}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <X size={20} color="white" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Photo Preview */}
        <View className="flex-1 px-6 py-4">
          <Image
            source={{ uri: selectedPhoto }}
            className="flex-1 rounded-3xl"
            style={{ resizeMode: 'cover' }}
          />
        </View>

        {/* Process Button */}
        <View className="px-6 py-6">
          <Pressable
            onPress={handleProcess}
            className="py-4 rounded-2xl items-center flex-row justify-center active:opacity-90"
            style={{
              backgroundColor: colors.honey[400],
              shadowColor: colors.honey[400],
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
            }}
          >
            <Sparkles size={20} color="white" strokeWidth={2} />
            <Text style={{ color: 'white', fontFamily: 'Inter', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
              Analyze with AI
            </Text>
          </Pressable>

          <Pressable
            onPress={handleClearPhoto}
            className="mt-3 py-3 items-center"
          >
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter', fontSize: 14 }}>
              Take a different photo
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Camera mode
  return (
    <View className="flex-1 bg-black">
      {/* Camera View - no children to avoid warning */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
      />

      {/* Overlay UI - positioned absolutely on top of camera */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Header Overlay */}
        <SafeAreaView edges={["top"]} style={{ flex: 0 }}>
          <View className="flex-row items-center justify-between px-6 py-4">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            >
              <ArrowLeft size={20} color="white" strokeWidth={2} />
            </Pressable>
            <View className="flex-row">
              <Pressable
                onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
              >
                <RotateCcw size={18} color="white" strokeWidth={2} />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>

        {/* Center Guide */}
        <View className="flex-1 items-center justify-center px-6">
          <View
            className="w-full aspect-[4/3] rounded-3xl border-2"
            style={{ borderColor: 'rgba(255,255,255,0.4)', borderStyle: 'dashed' }}
          />
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter', fontSize: 14, marginTop: 16, textAlign: 'center' }}>
            Frame your pantry shelves
          </Text>
        </View>

        {/* Bottom Controls */}
        <SafeAreaView edges={["bottom"]} style={{ flex: 0 }}>
          {/* Capture Controls */}
          <View
            className="flex-row items-center justify-between px-6 py-6"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          >
            {/* Gallery Button */}
            <Pressable
              onPress={handlePickImage}
              className="w-14 h-14 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <ImageIcon size={24} color="white" strokeWidth={1.5} />
            </Pressable>

            {/* Capture Button */}
            <Pressable
              onPress={handleCapture}
              disabled={isCapturing}
              className="w-20 h-20 rounded-full items-center justify-center"
              style={{
                backgroundColor: isCapturing ? colors.stone[300] : 'white',
              }}
            >
              {isCapturing ? (
                <ActivityIndicator color={colors.text.primary} />
              ) : (
                <View
                  className="w-16 h-16 rounded-full"
                  style={{ backgroundColor: colors.sage[200] }}
                />
              )}
            </Pressable>

            {/* Spacer for symmetry */}
            <View className="w-14 h-14" />
          </View>

          {/* Hint Text */}
          <View className="pb-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter', fontSize: 12, textAlign: 'center' }}>
              Take a photo or choose from gallery
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}
