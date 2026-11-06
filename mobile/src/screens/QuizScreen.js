import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import api from '../services/api';
import { colors, touchTargets } from '../theme/colors';

export const QuizScreen = () => {
  const [questions, setQuestions] = useState([
    {
      id: 'q1',
      text: 'What is the average time complexity of searching in a Balanced Binary Search Tree (AVL Tree)?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
      correctAnswer: 1,
    },
    {
      id: 'q2',
      text: 'Which normal form eliminates partial functional dependencies on candidate keys?',
      options: ['1NF', '2NF', '3NF', 'BCNF'],
      correctAnswer: 1,
    },
    {
      id: 'q3',
      text: 'In machine learning, what technique prevents overfitting by adding a penalty for large weights?',
      options: ['Regularization', 'Backpropagation', 'Activation function', 'Max pooling'],
      correctAnswer: 0,
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleSelectOption = (index) => {
    if (submitted) return;
    setSelectedAnswers({
      ...selectedAnswers,
      [currentIndex]: index,
    });
  };

  const handleSubmit = () => {
    let earned = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) earned += 1;
    });
    setScore(earned);
    setSubmitted(true);
  };

  const currentQ = questions[currentIndex];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>AI Practice Quiz (FR-S07)</Text>
      <Text style={styles.subtitle}>Question {currentIndex + 1} of {questions.length}</Text>

      {submitted ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Quiz Completed!</Text>
          <Text style={styles.scoreText}>
            Score: {score} / {questions.length} ({Math.round((score / questions.length) * 100)}%)
          </Text>
          <Text style={styles.feedbackText}>
            {score === questions.length
              ? 'Flawless performance! You demonstrate thorough mastery of core computer science principles.'
              : 'Good attempt. Review the topics you missed to reinforce your understanding.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setSubmitted(false);
              setCurrentIndex(0);
              setSelectedAnswers({});
            }}
          >
            <Text style={styles.retryBtnText}>Retake Quiz</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.questionText}>{currentQ.text}</Text>

          {/* Large Touch-Friendly Option Cards */}
          {currentQ.options.map((opt, optIdx) => {
            const isSelected = selectedAnswers[currentIndex] === optIdx;
            return (
              <TouchableOpacity
                key={optIdx}
                style={[
                  styles.optionCard,
                  isSelected && styles.selectedOptionCard,
                ]}
                onPress={() => handleSelectOption(optIdx)}
                accessibilityRole="button"
              >
                <View style={[styles.optionBadge, isSelected && styles.selectedOptionBadge]}>
                  <Text style={[styles.badgeText, isSelected && { color: '#fff' }]}>
                    {String.fromCharCode(65 + optIdx)}
                  </Text>
                </View>
                <Text style={[styles.optionText, isSelected && { color: colors.accent, fontWeight: 'bold' }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, currentIndex === 0 && { opacity: 0.5 }]}
              disabled={currentIndex === 0}
              onPress={() => setCurrentIndex((p) => p - 1)}
            >
              <Text style={styles.navBtnText}>Previous</Text>
            </TouchableOpacity>

            {currentIndex < questions.length - 1 ? (
              <TouchableOpacity
                style={[styles.navBtn, styles.nextBtn]}
                onPress={() => setCurrentIndex((p) => p + 1)}
              >
                <Text style={[styles.navBtnText, { color: '#fff' }]}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.navBtn, styles.submitBtn]}
                onPress={handleSubmit}
              >
                <Text style={[styles.navBtnText, { color: '#fff' }]}>Submit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 18 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  questionText: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 20, lineHeight: 24 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: touchTargets.borderRadius,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    minHeight: touchTargets.minButtonHeight,
  },
  selectedOptionCard: {
    borderColor: colors.accent,
    backgroundColor: '#e0f2fe',
  },
  optionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedOptionBadge: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  badgeText: { fontSize: 13, fontWeight: 'bold', color: colors.textMuted },
  optionText: { fontSize: 15, color: colors.text, flex: 1 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  navBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  navBtnText: { fontWeight: 'bold', color: colors.text },
  nextBtn: { backgroundColor: colors.accent },
  submitBtn: { backgroundColor: colors.success },
  resultCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  resultTitle: { fontSize: 20, fontWeight: 'bold', color: '#166534' },
  scoreText: { fontSize: 28, fontWeight: 'bold', color: '#15803d', marginVertical: 8 },
  feedbackText: { fontSize: 14, color: '#166534', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: 'bold' },
});
