export const getEarlyYearsLevelKey = (level: string): 'nursery1' | 'nursery2' | 'learninghub' | 'kg' => {
  const l = (level || '').toLowerCase();
  if (l.includes('hub') || l.includes('learning')) {
    return 'learninghub';
  }
  if (l.includes('kg') || l.includes('kindergarten')) {
    return 'kg';
  }
  if (l.includes('nursery 1') || l.includes('nursery1') || l.includes('nur 1') || l.includes('nur1')) {
    return 'nursery1';
  }
  return 'nursery2'; // Default
};

const CURRICULUM_DATA: Record<string, Record<string, string[]>> = {
  nursery1: {
    'First Term': [
      // NUMERACY
      'Can identify and recognise numbers from 0-100',
      'Can do simple addition of numbers 0-9 e.g 2+3, 3+4',
      'Can differentiate between greater than and less than numbers',
      'Can write numbers in word from 1-10',
      'Can write roman figures from 1-10 i.e., i-1, ii-2 etc',

      // LITERACY
      'Can identify the english alphabets from Aa-Zz',
      'Can recognise the english alphabets from Aa-Zz',
      'Can identify the five short vowel sounds (aeiou)',
      'Can sound two letter words using the five short vowel sounds',
      'Can blend and write the two letters word using the vowel sound',

      // CREATIVE ART
      'Can scribble neatly within limit',
      'Can identify the primary and secondary colours. E.g. blue, brown',
      'Can identify the objects to be coloured',
      'Can grip the crayon in a tripod position',
      'Can sit uprightly while colouring',

      // RHYMES
      "Can recite the rhymes 'Banana, banana'",
      "Can follow the rhymes 'Pawpaw is a kind of fruit'",
      "Can recite the rhymes 'I went to the market I went to the shop'",

      // SENSORIAL EDUCATION
      'Can identify and recognise some parts of the body e.g chin, cheek',
      'Can identify and say the function of each of the sense organs',
      'Can list some of the things needed before taking our bathes. Eg',
      'Can list some personal hygiene e.g washing of hands, brushing',
      'Can list some of the classes of food e.g carbohydrates, protein',

      // SOCIAL & EMOTIONAL DEVELOPMENT
      'Can define family',
      'Can list the two types of family',
      'Can list six members of family. E.g father, mother e.t.c',
      'Can define and list places found at home. Eg bedroom, sitting room',
      'Can define school and list thing that are found in school, Eg chair',
      'Can define community helpers and list some of the community helpers',

      // HANDWRITING
      'Can copy and writes all alphabetical letters from Aa-Zz',
      'Can write from left-right and from top-bottom neatly',
      'Can hold the pencil in a tripod position',
      'Can sit uprightly while writing',
      'Can write on a straight line',
      'Can write letters and numbers repeatedly on a separate line'
    ],
    'Second Term': [
      // NUMERACY
      'Can do simple addition of numbers',
      'Can do simple subtraction of numbers',
      'Can identify and recognise money eg 10naira',
      'Can do addition and subtraction of money',

      // LITERACY
      'Can blend 3 letters word eg cat, rat e.t.c',
      'Can recognise 3 letter\'s word',
      'Can form 3 letters words',
      'Can used article "A"',

      // CREATIVE ART
      'Can scribble neatly within limit',
      'Can identify both the primary and secondary colours. E.g. blue, green',
      'Can grip the crayon in a tripod position',
      'Can sit uprightly while colouring',
      'Can identify the object(s) to be coloured',

      // SENSORIAL EDUCATION
      'Can define water and list their uses',
      'Can define animals and list their parts',
      'Can define creepy crawlies animals and give their examples',
      'Can list land and water animals',

      // RHYMES
      'Can recite the rhyme "leyila leyila"',
      'Can recite the rhyme "rain rain go away"',
      'Can recite the rhyme "if you hear your name"',
      'Can follow the rhymes "You want to know me"',
      'Can follow the rhymes "twinkle twinkle little star"',

      // SOCIAL & EMOTIONAL DEVELOPMENT
      'Can define clothes and list their examples',
      'Can define transportation and the means of transportation',
      'Can define plants with their parts',
      'Can define flower and the types of flowers',
      'Can define fruits and list the examples of fruits',

      // HANDWRITING
      'Can writes all the letters from A-Z in both cases',
      'Can writes from left-right and from top-bottom neatly',
      'Can copy from the whiteboard',
      'Can hold the pencil in a tripod position',
      'Can sit uprightly while writing'
    ],
    'Third Term': [
      // NUMERACY
      'Can recognize shapes e.g cylinder, cone etc',
      'Can identify fractions like 1/2, 1/3 etc',
      'Can list some instrument use for measurement',
      'Can do simple addition of tens and units',
      'Can differentiate between longer and shorter object',
      'Can differentiate between heavier & lighter objects e.g. Stone & leaf',

      // LITERACY
      'Can use article \'an\' in a simple sentence',
      'Can make simple sentences with the use of \'this is a\' or \'this is an\'',
      'Can define preposition',
      'Can list some of examples of preposition',
      'Can write the plural of some words e.g boy-boys, ball-balls',
      'Can define a noun and give some examples',

      // CREATIVE ART
      'Can scribble neatly within limits',
      'Can identify colours',
      'Can identify some of the objects to be coloured',
      'Can scribble colours on an object within a specific limit',
      'Can grasp crayon in a tripod position',
      'Can sit uprightly while colouring',

      // SENSORIAL EDUCATION
      'Can define disease and give examples',
      'Can define food',
      'Can differentiate between healthy and unhealthy food',
      'Can define health',

      // RHYMES
      'Can recite the rhyme "these are my private parts"',
      'Can recite the rhymes "Bumbale"',
      'Can follow the rhymes "A.B.C.D song"',
      'Can recite the rhymes "two little black birds sitting on the wall"',
      'Can recite the rhymes "twinkle, twinkle little star"',

      // SOCIAL & EMOTIONAL DEVELOPMENT
      'Can define bird and list some examples',
      'Can define insects and list some example',
      'Can list some examples of musical instrument',
      'Can mention some types of emotions',
      'Can define cleanliness and list some way of cleanliness',

      // HANDWRITING
      'Can write simple sentences',
      'Can put equal spaces between letters while writing',
      'Can write from left to right and from top to bottom neatly',
      'Can grip pencil in a tripod position',
      'Can sit uprightly while writing'
    ]
  },
  nursery2: {
    'First Term': [
      // NUMERACY
      'Can identify and recognise numbers from 0 - 400',
      'Can differentiate between the greater than & less than sign (< >)',
      'Can write the appropriate sign in box provided using the greater or less than sign.',
      'Can write number in words from 1 - 20',
      'Can add numbers less than 100',
      'Can count with their fingers for adding numbers',

      // LITERACY
      'Can differentiate between the vowel & consonant letters',
      'Can form 3 & 4 letters words e.g. pat, map, etc.',
      'Can define and list some of the tricky words e.g. there, was, she',
      'Can identify and write some of the tricky words e.g. she, we, he, to',

      // CREATIVE ART
      'Can scribble neatly within limit',
      'Can identify both the primary & secondary colours',
      'Can identify the objects to be coloured',
      'Can grasp the crayon in tripod position',
      'Can colour the objects as shown in a sample with specific limits',
      'Can sit uprightly while colouring',

      // SENSORIAL EDUCATION
      'Can identify some parts of the body',
      'Can identify & say the functions of each sense organ',
      'Can define & list some examples of root plants e.g potatoes',
      'Can define & list some examples of fruits e.g apple, banana',
      'Can define the healthy diet',
      'Can list some classes of food and list examples',

      // RHYMES
      'Can follow the rhymes jolly jolly phonics',
      'Can sing the rhymes "how do you do"',
      'Can follow the rhymes "1,2... buckle my shoe"',
      'Can sing the rhymes "you want to know me"',
      'Can follow the rhyme "The wheel on the bus"',

      // SOCIAL & EMOTIONAL DEVELOPMENT
      'Can say the greetings within the time varies e.g. in the morning...',
      'Can define and list some items that are found in the home e.g. bed',
      'Can define action and list some examples of action e.g. running',
      'Can define plants & list the types of plant e.g. tree, herbs etc',
      'Can define birds and list some examples of birds e.g. owl, parrot',

      // HANDWRITING
      'Can write all the alphabetical letters from A - Z in both cases',
      'Can write from left to right and from top to bottom neatly',
      'Can hold pencil in tripod position',
      'Can sit uprightly while writing',
      'Can write on a straight line',
      'Can copy from the board to the exercise book'
    ],
    'Second Term': [
      // NUMERACY
      'Can define fraction and identify them eg 1/2, 1/3, 1/4 etc',
      'Can do subtraction of numbers less than 100',
      'Can do addition and subtraction of money naira and kobo',
      'Can differentiate between longer and shorter things',

      // LITERACY
      'Can make simple sentences',
      'Can write simple sentences',
      'Can write the opposite of some word eg white-black',
      'Can define a noun',
      'Can give example of a noun',
      'Can write the plural of some words',

      // CREATIVE ART
      'Can scribble crayon neatly within line',
      'Can recognize the colours',
      'Can grip the crayon in a tripod position',
      'Can scribble colour on an object within a specific limit',
      'Can identify the objects to be coloured',

      // RHYMES
      'Can sing the rhymes "You want to know me..."',
      'Can follow the rhymes "Spell education..."',
      'Can follow the rhymes "I went to the market/I went to the shop..."',
      'Can follow the rhymes "1,2,3,4,5,once I caught a fish"',

      // SENSORIAL EDUCATION
      'Can define animal and list the types',
      'Can define insects and list their examples',
      'Can define cleanliness',
      'Can define healthy habit and give examples',
      'Can define electric appliances and give examples',

      // SOCIAL & EMOTIONAL DEVELOPMENT
      'Can define clothes and give examples',
      'Can define water bodies',
      'Can define and give types of soil',
      'Can define and give examples of landforms',
      'Can define and give examples of public places',

      // HANDWRITING
      'Can writes in a straight line',
      'Can hold pencil correctly and form letters accurately',
      'Can write some of the tricky words',
      'Can put equal space between letters while writing',
      'Can sit uprightly while writing'
    ],
    'Third Term': [
      // NUMERACY
      'Can tell exact hour on different faces of clock',
      'Can differentiate between heavy and light object',
      'Can define capacity',
      'Can list some examples of 3-dimensional shapes',
      'Can identify flat shapes e.g square, circle',

      // LITERACY
      "Can use article 'A', 'An', 'Some' in a sentence",
      'Can write the present and past tense of some word e.g go-went',
      'Can use is, are, my, your in a sentence',
      'Can differentiate between His and Her',
      'Can define and give examples of a verb',

      // CREATIVE ART
      'Can scribble neatly within limits',
      'Can recognize both the primary and the secondary colours',
      'Can identify the objects to be coloured',
      'Can grasp crayon in a tripod position',
      'Can draw and colour some of the simple objects',

      // RHYMES
      'Can recite the rhymes "these are my private parts"',
      'Can follow the rhymes "baa baa black sheep"',
      'Can recites the rhymes "all work and no play"',
      'Can follow the rhymes "I\'m a little teapot"',

      // SENSORIAL EDUCATION
      'Can define childhood diseases',
      'Can list some examples of childhood diseases',
      'Can define immunisation',
      'Can define road signs and list some examples of road signs',
      'Can define first aids and list some content in the first aid box',

      // SOCIAL & EMOTIONAL DEVELOPMENT
      'Can define and list some examples of community helpers',
      'Can identify the colour of the Nigerian flag',
      'Can say the name of his/her country',
      'Can sing the National Anthem',
      'Can define drug abuse and list some drugs that are abused',

      // HANDWRITING
      'Can hold pencil in a tripod position and form letters accurately',
      'Can copy neatly from the board to the exercise book',
      'Can write some of the tricky words',
      'Can put equal space between words while writing',
      'Can write clearly on a straight line',
      'Can sit uprightly while writing'
    ]
  },
  learninghub: {
    'First Term': [
      // NUMERACY
      'Can read numbers from 0 - 15',
      'Can count objects from 1 - 3 with their fingers',
      'Can identify numbers from 0 - 15',
      'Can recognize numbers from 0 - 15',
      'Can trace numbers from 0 - 15',

      // LITERACY
      'Can read letters from Aa - Jj',
      'Can recognize letters from Aa - Jj',
      'Can identify letters from Aa - Jj',
      'Can sound letters from Aa - Jj',
      'Can trace letters from Aa - Jj',

      // CREATIVE ART
      'Can scribble neatly within limit',
      'Can recognize the primary colours e.g. blue, green, red',
      'Can grip the crayon in a tripod position',
      'Can sit uprightly while colouring',
      'Can identify the object(s) to be coloured',

      // SENSORIAL EDUCATION
      'Can identify colours e.g. blue, green, red etc',
      'Can identify the plane shapes e.g. square, circle, triangle',
      'Can differentiate between sizes of objects. E.g. small, big',
      'Can identify some parts of the body. E.g. eyes, nose, ear',

      // RHYMES
      'Can recite the rhyme "pussy cat, pussy cat..."',
      'Can recite the rhyme "motor car, motor car..."',
      'Can recite the rhyme "if you hear your name..."',
      'Can follow the rhymes "1,2,3,4,5, Once I caught a fish..."',
      'Can follow the rhymes "twinkle twinkle little star..."',

      // SOCIAL & EMOTIONAL DEVELOPMENT
      'Can wash his/her hand',
      'Can brush his/her teeth',
      'Can fold his/her clothes',
      'Can pour water into different vessels. E.g. bottle, cup',
      'Can put on his/her shoes',

      // HANDWRITING
      'Can trace the letters Aa - Jj',
      'Can trace the numbers 0 - 20',
      'Can trace from top to bottom neatly',
      'Can hold the pencil in a tripod position',
      'Can sit uprightly while colouring'
    ],
    'Second Term': [
      // NUMERACY
      'Can read numbers from 0 - 30',
      'Can count objects from 1 - 10',
      'Can identify numbers from 0 - 30',
      'Can recognize numbers from 0 - 30',
      'Can trace numbers from 0 - 30',

      // LITERACY
      'Can read letters from Aa - Mm',
      'Can recognize letters from Aa - Mm',
      'Can identify letters from Aa - Mm',
      'Can sound letters from Aa - Mm',
      'Can trace letters from Aa - Mm',

      // CREATIVE ART
      'Can scribble neatly within limit',
      'Can grip the crayon in a tripod position',
      'Can sit uprightly while colouring',
      'Can identify object to be coloured',

      // SENSORIAL EDUCATION
      'Can identify his or her bag',
      'Can identify his or her lunchbox',
      'Can identify some fruits e.g orange and watermelon',

      // RHYMES
      'Can recite the rhyme "pussy cat, pussy cat..."',
      'Can recite the rhyme "motor car, motor car..."',
      'Can recite the rhyme "if you hear your name..."',
      'Can follow the rhymes "This is the way I brush my teeth..."',

      // SOCIAL & EMOTIONAL DEVELOPMENT
      'Can wash his/her hand',
      'Can brush his/her teeth',
      'Can fold his/her clothes',
      'Can put and remove books from his/her bag',

      // HANDWRITING
      'Can trace the letters Aa - Mm',
      'Can trace the numbers 0 - 30',
      'Can trace from left-right and top-bottom neatly',
      'Can hold the pencil in a tripod position',
      'Can sit uprightly while writing'
    ],
    'Third Term': [
      // NUMERACY
      'Can read numbers from 0 - 20',
      'Can identify numbers from 0 - 20',
      'Can recognize numbers from 0 - 20',
      'Can count numbers from 0 - 20',
      'Can trace numbers from 0 - 20',

      // LITERACY
      'Can read letters from A - Z',
      'Can sound letters from A - Z',
      'Can identify letters from A - Z',
      'Can recognize letters from A - Z',
      'Can trace letters from A - Z',

      // CREATIVE ART
      'Can scribble neatly within limit',
      'Can grasp the crayon in a tripod position',
      'Can sit uprightly while colouring',
      'Can identify object to be coloured',

      // SENSORIAL EDUCATION
      'Can identify colours e.g Blue, red',
      'Can identify the plane shapes e.g circle, triangle',
      'Can fill up an empty basket with some objects',

      // RHYMES
      'Can recite the rhymes "1,2... buckle my shoe"',
      'Can recite the rhymes "finger\'s family"',
      'Can recite the rhymes "one little, two little fingers..."',
      'Can follow the rhymes "put your hands above your head"',

      // SOCIAL & EMOTIONAL DEVELOPMENT
      'Can open and close objects e.g bottle covers',
      'Can put on his/her shoes',
      'Can communicate among his/her peers',

      // HANDWRITING
      'Can trace the letters Aa - Zz',
      'Can trace the numbers 0 - 50',
      'Can trace from left to right neatly',
      'Can hold pencil in a tripod position',
      'Can sit uprightly while writing'
    ]
  },
  kg: {
    'First Term': [
      // NUMERACY
      'Can read numbers from 0 - 15',
      'Can count objects from 1 - 5 with their fingers',
      'Can identify numbers from 0 - 15',
      'Can recognize numbers from 0 - 15',
      'Can trace numbers from 0 - 15',

      // LITERACY
      'Can read letters from Aa - Jj',
      'Can recognize letters from Aa - Jj',
      'Can identify letters from Aa - Jj',
      'Can sound letters from Aa - Jj',
      'Can trace letters from Aa - Jj',

      // CREATIVE ART
      'Can scribble neatly within limit',
      'Can recognize the primary colours. E.g. blue, green, red',
      'Can grip the crayon in a tripod position',
      'Can sit uprightly while colouring',
      'Can identify the object(s) to be coloured',

      // SENSORIAL EDUCATION
      'Can identify colours e.g. blue, green, red etc',
      'Can identify the plane shapes e.g. square, circle, triangle',
      'Can differentiate between sizes of objects. E.g. small, big',
      'Can identify some parts of the body. E.g. eyes, nose, ear',

      // RHYMES
      'Can recite the rhyme "pussy cat, pussy cat..."',
      'Can recite the rhyme "motor car, motor car..."',
      'Can recite the rhyme "if you hear your name..."',
      'Can follow the rhymes "1,2,3,4,5, Once I caught a fish..."',
      'Can follow the rhymes "twinkle twinkle little star..."',

      // SOCIAL & EMOTIONAL DEVELOPMENT
      'Can wash his/her hand',
      'Can brush his/her teeth',
      'Can fold his/her clothes',
      'Can pour water into different vessels. E.g. bottle, cup',
      'Can put on his/her shoes',

      // HANDWRITING
      'Can trace the letters Aa - Jj',
      'Can trace the numbers 0 - 20',
      'Can trace from top to bottom neatly',
      'Can hold the pencil in a tripod position',
      'Can sit uprightly while colouring'
    ],
    'Second Term': [
      // NUMERACY
      'Can read numbers from 15 - 30',
      'Can count numbers from 15 - 30',
      'Can identify numbers from 15 - 30',
      'Can recognize numbers from 15 - 30',
      'Can trace numbers from 15 - 30',

      // LITERACY
      'Can read letters from Kk - Sz',
      'Can recognize letters from Kk - Sz',
      'Can identify letters from Kk - Sz',
      'Can sound letters from Kk - Sz',
      'Can trace letters from Kk - Sz',

      // CREATIVE ART
      'Can scribble neatly within limit',
      'Can recognize the primary colours. E.g. black, pink, white e.t.c',
      'Can grip the crayon in a tripod position',
      'Can sit uprightly while colouring',
      'Can identify the object(s) to be coloured',

      // SENSORIAL EDUCATION
      'Differentiate between rough and smooth substances',
      'Can fill up an empty basket with some objects',
      'Can determine the height and length of an objects',
      'Can select the cut paper shapes and merge it on',

      // RHYMES
      'Can recite the rhyme "pussy cat, pussy cat..."',
      'Can recite the rhyme "motor car, motor car..."',
      'Can recite the rhyme "if you hear your name..."',
      'Can follow the rhymes "1,2,3,4,5, Once I caught a fish..."',
      'Can follow the rhymes "twinkle twinkle little star..."',

      // SOCIAL & EMOTIONAL DEVELOPMENT
      'Can button up his/her shirt',
      'Can transfer substances such as serving food for oneself',
      'Can open and close cloth pegs and used it',
      'Can identify simple emotion eg happy and sad face',

      // HANDWRITING
      'Can trace letters from Aa - Ss',
      'Can trace the numbers 0 - 30',
      'Can trace from top to bottom neatly',
      'Can hold the pencil in a tripod position',
      'Can sit uprightly while writing'
    ],
    'Third Term': [
      // NUMERACY
      'Can read numbers from 0 - 50',
      'Can count object that ranges from 1 - 20',
      'Can identify and recognize numbers from 0 - 50',
      'Can copy and write numbers from 0 - 50',
      'Can identify and recognize plane shapes e.g star, oval, heart',

      // LITERACY
      'Can read letters from Aa - Zz',
      'Can identify and recognize letters from Aa - Zz',
      'Can sound letters from Aa - Zz',
      'Can match any capital letters to its small letter from A - Z',
      'Can copy and write the letters from Aa - Zz',

      // CREATIVE ART
      'Can scribble neatly within limit',
      'Can recognize colours e.g black, white',
      'Can scribble colours on a objects within a specific limit',
      'Can grasp the crayon in a tripod position',
      'Can sit uprightly while colouring',

      // SENSORIAL EDUCATION
      'Can differentiate between soft and hard substances',
      'Can identify tastes like sweetness, sour, saltiness',
      'Can differentiate between bright and dull colours e.g white & black',
      'Can identify smells e.g pleasant and unpleasant smell',

      // RHYMES
      'Can recite the rhyme "if you see an old woman"',
      'Can follow the rhyme "mummy, mummy"',
      'Can recite the rhyme "little boys and little girls"',
      'Can recite the rhyme "I love Allah"',
      'Can follow the rhyme "these are my private parts"',

      // SOCIAL & EMOTIONAL DEVELOPMENT
      'Can cut a strip of a paper with the use of a scissors',
      'Can differentiate between happy and sad face',
      'Can set a table',
      'Can thread a button',

      // HANDWRITING
      'Can copy and write letters from Aa - Zz',
      'Can copy and write numbers from 0 - 50',
      'Can copy from left to right and from top to bottom neatly',
      'Can grip pencil in a tripod position',
      'Can sit uprightly while writing'
    ]
  }
};

export const getNurserySubjectNames = (level: string, term: string): string[] => {
  const levelKey = getEarlyYearsLevelKey(level);
  const termKey = term || 'Second Term';
  const levelData = CURRICULUM_DATA[levelKey] || CURRICULUM_DATA.nursery2;
  return levelData[termKey] || levelData['Second Term'] || [];
};
