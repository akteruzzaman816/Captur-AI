import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Button, Image, TextInput } from "react-native";
import {
  setDelay,
  setTimeout,
  setApiKey,
  prepareModel,
  getConfig,
  CapturCameraView,
  subscribeToEvents,
  endAttempt,
  retake,
} from "@captur-ai/captur-react-native-events";

const DELAY = 1;
const TIMEOUT = 25;
const LOCATION_NAME = "Paris";
const ASSET_TYPE = "eScooter";
const API_KEY = "captur-workspace-6814e62e8ab976c5b68fb611.e82f040f-4110-4267-be17-9327caeffb4d";

async function initializeCamera() {
  await setTimeout(TIMEOUT);
  await setDelay(DELAY);
  await setApiKey(API_KEY);
  await prepareModel(LOCATION_NAME, ASSET_TYPE, 0.0, 0.0);
  await getConfig(LOCATION_NAME, ASSET_TYPE, 0.0, 0.0);
}

export default function App() {
  const [startVerification, setStartVerification] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const [thumbnail, setThumbnail] = useState(null);
  const [referenceId, setReferenceId] = useState(null);
  const guidanceInputRef = useRef(null);

  useEffect(() => {
    let unsubscriber;
    (async () => {
      await initializeCamera();

      unsubscriber = subscribeToEvents({
        capturDidGenerateEvent: (state, metadata) => {
          if (state === "cameraDecided") {
            setThumbnail("data:image/png;base64," + metadata?.imageDataBase64);
            guidanceInputRef.current?.setNativeProps({
              text: "",
            });
          }
        },
        capturDidGenerateError: (err) => {
          console.log("capturDidGenerateError", err);
        },
        capturDidGenerateGuidance: (meta) => {
          guidanceInputRef.current?.setNativeProps({
            text: meta.guidanceTitle,
          });
        },
        capturDidRevokeGuidance: () => {
          console.log("capturDidRevokeGuidance");
        },
      });
    })();

    return () => {
      unsubscriber?.();
    };
  }, []);

  useEffect(() => {
    setReferenceId(Date.now().toString());
  }, []);

  const handleStartVerification = async () => {
    try {
      if (thumbnail) {
        /**
         * Clears the image taken if exists.
         * Clears the prediction text
         * Start a new attempt ( thumbnail == true means that this is a subsequent attempt )
         * Retake has to be called if it's a subsequent attempt.
         */
        setThumbnail(null);
        guidanceInputRef.current?.setNativeProps({
          text: "",
        });
        await retake();
      }
      /**
       * Starts the camera, if it's not a retake there's no need to call retake and just start immediately.
       */
      setStartVerification(true);
    } catch (error) {
      console.log(error);
    }
  };

  const handleStopVerificiation = async () => {
    if (startVerification) {
      setStartVerification(false);
      setIsFlashOn(false);
      setIsZoomedIn(false);
      return await endAttempt();
    }
  };

  const handleFlash = () => {
    setIsFlashOn((prev) => !prev);
  };

  const handleZoom = () => {
    setIsZoomedIn((prev) => !prev);
  };

  const newSession = async () => {
    /**
     * Resets thumbnail, flash, zoom and prediction text.
     * Ends the attempt
     * Then starts the verification
     * This will start a new session with a new reference.
     */
    setThumbnail(null);
    setIsFlashOn(false);
    setIsZoomedIn(false);
    guidanceInputRef.current?.setNativeProps({
      text: "",
    });
    await endAttempt();

    setReferenceId(Date.now().toString());
    setStartVerification(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CapturCameraView
          key={referenceId}
          style={styles.camera}
          referenceId={referenceId ?? ""}
          startVerification={startVerification}
          isFlashOn={isFlashOn}
          isZoomedIn={isZoomedIn}
        />
      </View>

      {thumbnail && (
        <View style={styles.thumbnailContainer}>
          <Image style={styles.thumbnail} source={{ uri: thumbnail }} />
        </View>
      )}

      <View style={styles.actionButtons}>
        <Button title={"Start"} onPress={handleStartVerification} />
        <Button title={"Stop"} onPress={handleStopVerificiation} />
        {/* <Button
          title={isFlashOn ? "Turn flash off" : "Turn flash on"}
          onPress={handleFlash}
        />
        <Button
          title={isZoomedIn ? "Zoom out" : "Zoom in"}
          onPress={handleZoom}
        /> */}
        <Button title={"New session"} onPress={newSession} />
      </View>

      <View style={styles.guidance}>
        <TextInput
          style={styles.guidanceText}
          ref={guidanceInputRef}
          editable={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
    justifyContent: "flex-end",
  },
  camera: {
    flex: 1,
  },
  thumbnailContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "black",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  guidance: {
    position: "absolute",
    top: "10%",
    width: "100%",
    zIndex: 14,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingVertical: 12,
  },
  guidanceText: {
    color: "white",
    fontSize: 16,
  },
  actionButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    zIndex: 20,
    gap: 10,
  },
});
