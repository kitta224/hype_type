// 単語リスト管理用モジュール
export async function loadWordLists() {
    try {
        const response = await fetch('wordLists.json');
        return await response.json();
    } catch (error) {
        console.error('単語リストの読み込みに失敗しました:', error);
        // フォールバック用の単語リスト
        return {
            languages: {
                english: {
                    difficultyLevels: {
                        easy: { words: ["cat", "dog", "sun", "run", "fun"] },
                        medium: { words: ["apple", "banana", "orange", "grape"] },
                        hard: { words: ["strawberry", "pineapple", "chocolate"] },
                        expert: { words: ["extraordinary", "magnificent", "sophisticated"] }
                    }
                }
            }
        };
    }
}

export function getCurrentWordList(wordLists, language, difficulty) {
    if (wordLists.languages && wordLists.languages[language]) {
        const difficultyData = wordLists.languages[language].difficultyLevels[difficulty];
        return difficultyData ? difficultyData.words : [];
    }
    return [];
}
