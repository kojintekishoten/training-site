import Papa from 'papaparse';

export const fetchQuestions = async (csvUrl) => {
    return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
            download: true,
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length) {
                    console.error("Errors parsing CSV:", results.errors);
                }

                const data = results.data;
                if (data.length <= 1) {
                    resolve([]);
                    return;
                }

                // Skip the first row (header)
                const rows = data.slice(1);

                const questions = rows.map(row => {
                    return {
                        id: row[0],
                        question: row[1],
                        optionA: row[2],
                        optionB: row[3],
                        optionC: row[4],
                        optionD: row[5],
                        optionE: row[6],
                        optionF: row[7],
                        optionG: row[8],
                        optionH: row[9],
                        correctAnswer: row[10], // e.g., 'A', 'B', etc.
                        explanation: row[11],
                        imageUrl: row[12],
                    };
                }).filter(q => q.question);

                resolve(questions);
            },
            error: (error) => {
                console.error("Error fetching CSV:", error);
                reject(error);
            }
        });
    });
};

export const fetchAuthUsers = async (csvUrl) => {
    return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
            download: true,
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length) {
                    console.error("Errors parsing Auth CSV:", results.errors);
                }

                const data = results.data;
                if (data.length <= 1) {
                    resolve([]);
                    return;
                }

                // Skip the first row (header)
                const rows = data.slice(1);

                const users = rows.map(row => {
                    return {
                        userId: row[0],
                        password: row[1]
                    };
                }).filter(u => u.userId);

                resolve(users);
            },
            error: (error) => {
                console.error("Error fetching Auth CSV:", error);
                reject(error);
            }
        });
    });
};
