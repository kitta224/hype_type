// 単語リスト管理用モジュール
export async function loadWordLists() {
    try {
        const response = await fetch('./jsons/wordLists.json');
        const wordListsConfig = await response.json();

        for (const langKey in wordListsConfig.languages) {
            const language = wordListsConfig.languages[langKey];
            for (const diffKey in language.difficultyLevels) {
                const difficulty = language.difficultyLevels[diffKey];
                if (difficulty.path) {
                    const wordsResponse = await fetch(difficulty.path);
                    const wordsText = await wordsResponse.text();
                    difficulty.words = wordsText.split(/\r?\n/).map(word => word.trim()).filter(word => word.length > 0);
                    delete difficulty.path; // Clean up path property
                }
            }
        }
        return wordListsConfig;
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