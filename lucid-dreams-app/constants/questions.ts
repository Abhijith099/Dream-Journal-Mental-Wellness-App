export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  category: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  { id: "q1", text: "What is the capital of Japan?", options: ["Seoul", "Beijing", "Tokyo", "Kyoto"], correctAnswerIndex: 2, category: "Geography" },
  { id: "q2", text: "Which planet is known as the Red Planet?", options: ["Venus", "Jupiter", "Saturn", "Mars"], correctAnswerIndex: 3, category: "Science" },
  { id: "q3", text: "Who wrote 'Romeo and Juliet'?", options: ["Charles Dickens", "William Shakespeare", "Mark Twain", "Jane Austen"], correctAnswerIndex: 1, category: "Literature" },
  { id: "q4", text: "What is the largest mammal on Earth?", options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"], correctAnswerIndex: 1, category: "Nature" },
  { id: "q5", text: "In which year did the Titanic sink?", options: ["1905", "1912", "1920", "1898"], correctAnswerIndex: 1, category: "History" },
  { id: "q6", text: "What is the chemical symbol for Gold?", options: ["Ag", "Go", "Au", "Gd"], correctAnswerIndex: 2, category: "Science" },
  { id: "q7", text: "Which artist painted the Mona Lisa?", options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"], correctAnswerIndex: 2, category: "Art" },
  { id: "q8", text: "What is the longest river in the world?", options: ["Amazon", "Nile", "Yangtze", "Mississippi"], correctAnswerIndex: 1, category: "Geography" },
  { id: "q9", text: "How many continents are there on Earth?", options: ["5", "6", "7", "8"], correctAnswerIndex: 2, category: "Geography" },
  { id: "q10", text: "What is the hardest natural substance on Earth?", options: ["Gold", "Iron", "Diamond", "Platinum"], correctAnswerIndex: 2, category: "Science" },
  { id: "q11", text: "Which element has the atomic number 1?", options: ["Oxygen", "Hydrogen", "Carbon", "Helium"], correctAnswerIndex: 1, category: "Science" },
  { id: "q12", text: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Perth"], correctAnswerIndex: 2, category: "Geography" },
  { id: "q13", text: "Who painted the Starry Night?", options: ["Claude Monet", "Vincent van Gogh", "Edvard Munch", "Salvador Dali"], correctAnswerIndex: 1, category: "Art" },
  { id: "q14", text: "What is the primary language spoken in Brazil?", options: ["Spanish", "Portuguese", "French", "English"], correctAnswerIndex: 1, category: "Geography" },
  { id: "q15", text: "Which planet is closest to the Sun?", options: ["Venus", "Earth", "Mercury", "Mars"], correctAnswerIndex: 2, category: "Science" },
  { id: "q16", text: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correctAnswerIndex: 3, category: "Geography" },
  { id: "q17", text: "Who discovered penicillin?", options: ["Marie Curie", "Alexander Fleming", "Louis Pasteur", "Isaac Newton"], correctAnswerIndex: 1, category: "History" },
  { id: "q18", text: "How many bones are in the adult human body?", options: ["206", "250", "210", "195"], correctAnswerIndex: 0, category: "Science" },
  { id: "q19", text: "What is the square root of 64?", options: ["6", "7", "8", "9"], correctAnswerIndex: 2, category: "Math" },
  { id: "q20", text: "What is the national flower of Japan?", options: ["Lotus", "Cherry Blossom", "Rose", "Orchid"], correctAnswerIndex: 1, category: "Nature" },
  { id: "q21", text: "Which country is home to the kangaroo?", options: ["New Zealand", "South Africa", "Australia", "India"], correctAnswerIndex: 2, category: "Nature" },
  { id: "q22", text: "What is the capital of Canada?", options: ["Toronto", "Vancouver", "Montreal", "Ottawa"], correctAnswerIndex: 3, category: "Geography" },
  { id: "q23", text: "Who is known as the 'Father of Computers'?", options: ["Alan Turing", "Charles Babbage", "Bill Gates", "Steve Jobs"], correctAnswerIndex: 1, category: "History" },
  { id: "q24", text: "What color do you get by mixing red and yellow?", options: ["Green", "Purple", "Orange", "Brown"], correctAnswerIndex: 2, category: "Art" },
  { id: "q25", text: "What is the tallest mountain in the world?", options: ["K2", "Mount Kilimanjaro", "Mount Everest", "Mount Fuji"], correctAnswerIndex: 2, category: "Geography" },
  { id: "q26", text: "Which animal is known as the King of the Jungle?", options: ["Tiger", "Lion", "Elephant", "Gorilla"], correctAnswerIndex: 1, category: "Nature" },
  { id: "q27", text: "What is the freezing point of water in Celsius?", options: ["0", "32", "100", "-1"], correctAnswerIndex: 0, category: "Science" },
  { id: "q28", text: "Who wrote 'To Kill a Mockingbird'?", options: ["Harper Lee", "J.K. Rowling", "Ernest Hemingway", "F. Scott Fitzgerald"], correctAnswerIndex: 0, category: "Literature" },
  { id: "q29", text: "What is the largest desert in the world?", options: ["Sahara", "Arabian", "Gobi", "Antarctic Desert"], correctAnswerIndex: 3, category: "Geography" },
  { id: "q30", text: "Which instrument has 88 keys?", options: ["Violin", "Guitar", "Piano", "Flute"], correctAnswerIndex: 2, category: "Art" },
  { id: "q31", text: "What is the main gas found in the Earth's atmosphere?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], correctAnswerIndex: 2, category: "Science" },
  { id: "q32", text: "Who was the first person to walk on the moon?", options: ["Yuri Gagarin", "Buzz Aldrin", "Neil Armstrong", "Michael Collins"], correctAnswerIndex: 2, category: "History" },
  { id: "q33", text: "What is the currency of the United Kingdom?", options: ["Euro", "Pound Sterling", "Dollar", "Franc"], correctAnswerIndex: 1, category: "Geography" },
  { id: "q34", text: "Which fruit is known for keeping the doctor away?", options: ["Banana", "Orange", "Apple", "Grape"], correctAnswerIndex: 2, category: "General Knowledge" },
  { id: "q35", text: "What is the fastest land animal?", options: ["Lion", "Cheetah", "Leopard", "Horse"], correctAnswerIndex: 1, category: "Nature" },
  { id: "q36", text: "How many days are in a leap year?", options: ["364", "365", "366", "367"], correctAnswerIndex: 2, category: "General Knowledge" },
  { id: "q37", text: "What is the most widely spoken language in the world?", options: ["English", "Mandarin", "Spanish", "Hindi"], correctAnswerIndex: 0, category: "Geography" },
  { id: "q38", text: "Which Italian city is famous for its canals?", options: ["Rome", "Milan", "Venice", "Florence"], correctAnswerIndex: 2, category: "Geography" },
  { id: "q39", text: "What is the chemical formula for water?", options: ["CO2", "O2", "H2O", "NaCl"], correctAnswerIndex: 2, category: "Science" },
  { id: "q40", text: "Which bird is a universal symbol of peace?", options: ["Eagle", "Dove", "Owl", "Swan"], correctAnswerIndex: 1, category: "Nature" },
  { id: "q41", text: "Which animal can live both on land and in water?", options: ["Dolphin", "Frog", "Eagle", "Giraffe"], correctAnswerIndex: 1, category: "Nature" },

  { id: "q42", text: "What is the largest planet in our solar system?", options: ["Saturn", "Earth", "Jupiter", "Neptune"], correctAnswerIndex: 2, category: "Science" },

  { id: "q43", text: "Which country is famous for the Great Wall?", options: ["Japan", "China", "India", "Thailand"], correctAnswerIndex: 1, category: "Geography" },

  { id: "q44", text: "How many sides does a triangle have?", options: ["2", "3", "4", "5"], correctAnswerIndex: 1, category: "Math" },

  { id: "q45", text: "Which animal is famous for its black and white stripes?", options: ["Zebra", "Tiger", "Panda", "Skunk"], correctAnswerIndex: 0, category: "Nature" },

  { id: "q46", text: "What is the capital of India?", options: ["Mumbai", "New Delhi", "Bengaluru", "Kolkata"], correctAnswerIndex: 1, category: "Geography" },

  { id: "q47", text: "Which planet is famous for its beautiful rings?", options: ["Mars", "Venus", "Saturn", "Mercury"], correctAnswerIndex: 2, category: "Science" },

  { id: "q48", text: "Which superhero is also known as Bruce Wayne?", options: ["Superman", "Iron Man", "Batman", "Spider-Man"], correctAnswerIndex: 2, category: "Movies" },

  { id: "q49", text: "Which fruit is yellow and curved?", options: ["Apple", "Banana", "Mango", "Pear"], correctAnswerIndex: 1, category: "Food" },

  { id: "q50", text: "How many legs does a spider have?", options: ["6", "8", "10", "12"], correctAnswerIndex: 1, category: "Nature" },

  { id: "q51", text: "Which ocean is between Africa and Australia?", options: ["Atlantic Ocean", "Pacific Ocean", "Indian Ocean", "Arctic Ocean"], correctAnswerIndex: 2, category: "Geography" },

  { id: "q52", text: "What do plants need from the Sun to make food?", options: ["Moonlight", "Sunlight", "Starlight", "Heat only"], correctAnswerIndex: 1, category: "Science" },

  { id: "q53", text: "Which sport uses a bat, ball, and wickets?", options: ["Baseball", "Cricket", "Tennis", "Hockey"], correctAnswerIndex: 1, category: "Sports" },

  { id: "q54", text: "Which Disney character has a magical talking snowman friend named Olaf?", options: ["Moana", "Elsa", "Rapunzel", "Ariel"], correctAnswerIndex: 1, category: "Movies" },

  { id: "q55", text: "What is the opposite of 'ancient'?", options: ["Old", "Historic", "Modern", "Traditional"], correctAnswerIndex: 2, category: "General Knowledge" },

  { id: "q56", text: "Which animal is known for having a pouch for carrying its baby?", options: ["Kangaroo", "Lion", "Elephant", "Penguin"], correctAnswerIndex: 0, category: "Nature" },

  { id: "q57", text: "What is the boiling point of water at sea level in Celsius?", options: ["50°C", "75°C", "100°C", "150°C"], correctAnswerIndex: 2, category: "Science" },

  { id: "q58", text: "Which city is known as the City of Love?", options: ["London", "Paris", "Rome", "Venice"], correctAnswerIndex: 1, category: "Geography" },

  { id: "q59", text: "How many colors are traditionally found in a rainbow?", options: ["5", "6", "7", "8"], correctAnswerIndex: 2, category: "Science" },

  { id: "q60", text: "Which animal is the tallest in the world?", options: ["Elephant", "Giraffe", "Camel", "Horse"], correctAnswerIndex: 1, category: "Nature" },

  { id: "q61", text: "What is the smallest prime number?", options: ["0", "1", "2", "3"], correctAnswerIndex: 2, category: "Math" },

  { id: "q62", text: "Which country is famous for the pyramids of Giza?", options: ["Egypt", "Mexico", "Greece", "Turkey"], correctAnswerIndex: 0, category: "History" },

  { id: "q63", text: "Which superhero carries a shield with a star?", options: ["Thor", "Captain America", "Hulk", "Iron Man"], correctAnswerIndex: 1, category: "Movies" },

  { id: "q64", text: "Which organ helps you think and control your body?", options: ["Heart", "Liver", "Brain", "Stomach"], correctAnswerIndex: 2, category: "Science" },

  { id: "q65", text: "Which drink is made from roasted coffee beans?", options: ["Tea", "Coffee", "Lemonade", "Cocoa"], correctAnswerIndex: 1, category: "Food" },

  { id: "q66", text: "How many hours are there in one day?", options: ["12", "18", "24", "36"], correctAnswerIndex: 2, category: "General Knowledge" },

  { id: "q67", text: "Which animal is known for saying 'moo'?", options: ["Sheep", "Cow", "Goat", "Horse"], correctAnswerIndex: 1, category: "Nature" },

  { id: "q68", text: "What is the capital of France?", options: ["Madrid", "Berlin", "Paris", "Lisbon"], correctAnswerIndex: 2, category: "Geography" },

  { id: "q69", text: "Which instrument is commonly played with a bow?", options: ["Piano", "Drums", "Violin", "Flute"], correctAnswerIndex: 2, category: "Music" },

  { id: "q70", text: "What is 10 × 10?", options: ["10", "50", "100", "1000"], correctAnswerIndex: 2, category: "Math" },

  { id: "q71", text: "Which animal is famous for storing food in its cheeks?", options: ["Hamster", "Tiger", "Eagle", "Horse"], correctAnswerIndex: 0, category: "Nature" },

  { id: "q72", text: "Which planet do we live on?", options: ["Mars", "Earth", "Venus", "Jupiter"], correctAnswerIndex: 1, category: "Science" },

  { id: "q73", text: "Which country is famous for the Taj Mahal?", options: ["India", "Pakistan", "Nepal", "Bangladesh"], correctAnswerIndex: 0, category: "History" },

  { id: "q74", text: "What is the main ingredient in traditional French fries?", options: ["Rice", "Potato", "Corn", "Wheat"], correctAnswerIndex: 1, category: "Food" },

  { id: "q75", text: "Which sport is played at Wimbledon?", options: ["Football", "Cricket", "Tennis", "Golf"], correctAnswerIndex: 2, category: "Sports" },

  { id: "q76", text: "Which superhero is famous for the phrase 'I am Iron Man'?", options: ["Thor", "Iron Man", "Batman", "Superman"], correctAnswerIndex: 1, category: "Movies" },

  { id: "q77", text: "What is the largest continent by land area?", options: ["Africa", "Europe", "Asia", "North America"], correctAnswerIndex: 2, category: "Geography" },

  { id: "q78", text: "Which animal is known for its ability to mimic human speech?", options: ["Parrot", "Penguin", "Eagle", "Ostrich"], correctAnswerIndex: 0, category: "Nature" },

  { id: "q79", text: "What is the name of the galaxy that contains our solar system?", options: ["Andromeda", "Milky Way", "Whirlpool", "Sombrero"], correctAnswerIndex: 1, category: "Science" },

  { id: "q80", text: "Which month has 28 days in a normal year?", options: ["January", "February", "March", "April"], correctAnswerIndex: 1, category: "General Knowledge" },
];
