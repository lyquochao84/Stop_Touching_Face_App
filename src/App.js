import React, { useState, useEffect, useRef } from "react";
import { initNotifications, notify } from "@mycv/f8-notification";
import { Howl } from "howler";
import "./App.css";
import soundURL from "./assets/eh_sound.mp3";

const tf = require("@tensorflow/tfjs");
const mobilenetModule = require("@tensorflow-models/mobilenet");
const knnClassifier = require("@tensorflow-models/knn-classifier");

const NOT_TOUCH_LABEL = "not _touch";
const TOUCHED_LABEL = "touched";
const TRAINING_TIMES = 50;
const CONFIDENCE_TOUCHED = 0.8;

// AI Sound
var sound = new Howl({
  src: [soundURL],
});

function App() {
  const video = useRef();
  const classifier = useRef();
  const mobilenetModel = useRef();
  const canPlaySound = useRef(true);
  const [touched, setTouched] = useState(false);
  const [label, setLabel] = useState('');
  const [progressText, setProgressText] = useState('');

  async function init() {
    alert("AI is coming...");
    await setupWebcam();
    alert("Setting Up...");

    try {
      mobilenetModel.current = await mobilenetModule.load();
      console.log("MobileNet model loaded successfully.");
    } 
    catch (error) {
      console.error("Error loading MobileNet model:", error);
      return; // Exit the function if model loading fails
    }

    classifier.current = knnClassifier.create();

    alert("Enjoy but 'Be Careful'! AI is watching you...");
    initNotifications({ cooldown: 1000 });
  }

  function setupWebcam() {
    return new Promise((res, rej) => {
      navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          (stream) => {
            video.current.srcObject = stream;
            video.current.addEventListener("loadeddata", res);
          },
          (error) => rej(error)
        );
      } else {
        rej();
      }
    });
  }

  async function train(label) {
    setLabel(`[${label} training] `);
    for (let i = 0; i < TRAINING_TIMES; i++) {
      setProgressText(`Progress ${parseInt(((i + 1) / TRAINING_TIMES) * 100)}%`);
      await training(label);
    }
  }

  /**
   * Step 1: Training to recognize the user haven't touch their face
   * Step 2: Training to recognize the user tou ched their face
   * Step 3: Get current webcam image, analyze and compare with the data just learned (recognized)
   * => If matched with data, warning the user
   *
   * @param {*} label
   * @returns
   */

  function training(label) {
    return new Promise(async (res) => {
      const embedding = mobilenetModel.current.infer(video.current, true);
      classifier.current.addExample(embedding, label);
      await sleep(100);
      res();
    });
  }

  async function run() {
    const embedding = mobilenetModel.current.infer(video.current, true);
    const result = await classifier.current.predictClass(embedding);

    if (
      result.label === TOUCHED_LABEL &&
      result.confidences[result.label] > CONFIDENCE_TOUCHED
    ) {
      console.log("Touched");
      if (canPlaySound.current === true) {
        canPlaySound.current = false;
        sound.play();
      }
      setTouched(true);
      notify("HEY HEY YOUR HAND", {
        body: "Warning! You just touched your face!",
      });
    } else {
      console.log("Not Touched");
      setTouched(false);
    }

    await sleep(200);

    run();
  }

  function sleep(ms = 0) {
    return new Promise((res) => setTimeout(res, ms));
  }

  useEffect(() => {
    init();

    sound.on("end", () => {
      canPlaySound.current = true;
    });

    // Cleanup Function
    return () => {};
  }, []);

  return (
    <body>
      <div className={`main ${touched ? "touched" : ""}`}>
        <video ref={video} className="video" autoPlay />
        <div className="control">
          <button onClick={() => train(NOT_TOUCH_LABEL)} className="btn">
            <span>Start</span>
          </button>
          <button onClick={() => train(TOUCHED_LABEL)} className="btn">
            <span>Next</span>
          </button>
          <button onClick={() => run()} className="btn">
            <span>Run</span>
          </button>
        </div>
        <div className='running-notification'>
          <span className='label-text'>{label}</span>
          <span className='progress-text'>{progressText}</span>
        </div>
        <div className="instructions">
          <h2 className="instructions_header">Instructions</h2>
          <div className='instructions_step_wrapper'>
            <div className="instructions_step">
              <p className="instructions_btn_text">
                <span className="instructions_btn_text_header">Start Button</span>
                : Click 'Start' to train the AI when your hand is away from your
                face
              </p>
            </div>
            <div className="instructions_step">
              <p className="instructions_btn_text">
                <span className="instructions_btn_text_header">Next Button</span>:
                Click 'Next' to train the AI when your hand touches your face.
              </p>
            </div>
            <div className="instructions_step">
              <p className="instructions_btn_text">
                <span className="instructions_btn_text_header">Run Button</span>:
                Click 'Run' to start using the application and receive warnings
                when your hand is near your face
              </p>
            </div>
          </div>
        </div>
      </div>
    </body>
  );
}

export default App;
