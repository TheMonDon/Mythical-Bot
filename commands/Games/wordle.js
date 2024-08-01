const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { readFileSync } = require('fs');
const path = require('path');

class Wordle extends Command {
  constructor(client) {
    super(client, {
      name: 'wordle',
      description: 'Play the famous wordle game',
      usage: 'wordle [hard | dev]',
      examples: ['wordle', 'wordle hard'],
      category: 'Games',
    });
  }

  async run(msg, args, level) {
    let dev = false;
    const current = this.client.games.get(msg.channel.id);
    if (current) {
      return this.client.util.errorEmbed(msg, `Please wait until the current game of \`${current.name}\` is finished.`);
    }

    let gameOver = false;
    let winner = false;
    let turn = 0;
    let error;
    const usedWords = [];
    const gameBoard = [];
    const allWords = readFileSync(path.join(__dirname, '/../../resources/word-list.txt'), 'utf8');
    const wordArray = allWords.split('\n');
    let filteredWords = wordArray.filter((word) => word.length === 5);
    let theWord = filteredWords[Math.floor(Math.random() * filteredWords.length)];
    let WIDTH = theWord.length;
    const HEIGHT = 6;

    // Allow the owner to use the dev test function
    if (args?.length > 0) {
      if (args[0] === 'dev') {
        if (level < 8) return msg.channel.send('You must be a developer to use this game type.');
        dev = true;
      } else if (args[0] === 'hard') {
        filteredWords = wordArray.filter((word) => word.length >= 6);
        theWord = filteredWords[Math.floor(Math.random() * filteredWords.length)];
        WIDTH = theWord.length;
      }
    }

    this.client.games.set(msg.channel.id, { name: this.help.name, user: msg.author.id });

    // Take the guess and the answer and return an array of results (🟩, 🟨, ⬜)
    function testWord(guess, answer) {
      const results = [];
      for (let i = 0; i < guess.length; i += 1) {
        const char = guess[i];
        if (char === answer[i]) {
          results.push('🟩');
        } else if (answer.includes(char)) {
          results.push('🟨');
        } else {
          results.push('⬜');
        }
      }
      return [results];
    }

    // Dev function to test double letter word without breaking the game
    function devTestWord(guess, answer) {
      const results = [];
      for (let i = 0; i < guess.length; i += 1) {
        const char = guess[i];
        if (char === answer[i]) {
          results.push('🟩');
        } else if (answer.includes(char)) {
          results.push('🟨');
        } else {
          results.push('⬜');
        }
      }
      return [results];
    }

    // Fill the game board with black squares
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        gameBoard[y * WIDTH + x] = '⬛';
      }
    }

    // Return the game board as a string
    function gameBoardToString() {
      let str = '';
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          str += gameBoard[y * WIDTH + x];
        }
        str += '\n';
      }
      return str;
    }

    // Check if the game is over, along with the winner and return an embed based on the results
    function getContent() {
      let embed;

      if (gameOver === true) {
        if (winner === true) {
          embed = new EmbedBuilder()
            .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL({ dynamic: true }) })
            .setColor(msg.settings.embedColor)
            .setTitle('Wordle (5 Minutes)')
            .setDescription(`${gameBoardToString()} \nYou won! (The word was \`${theWord}\`)`)
            .addFields([{ name: 'Turn:', value: (turn + 1).toString() }])
            .setTimestamp();
        } else {
          embed = new EmbedBuilder()
            .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL({ dynamic: true }) })
            .setColor(msg.settings.embedColor)
            .setTitle('Wordle (5 Minutes)')
            .setDescription(`${gameBoardToString()} \nYou lost! (The word was \`${theWord}\`)`)
            .addFields([{ name: 'Turn:', value: (turn + 1).toString() }])
            .setTimestamp();
        }
      } else {
        embed = new EmbedBuilder()
          .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL({ dynamic: true }) })
          .setColor(msg.settings.embedColor)
          .setTitle('Wordle (5 Minutes)')
          .setDescription(
            `${gameBoardToString()} \nGuess the word! (${theWord.length} letters)` +
              (dev ? `\nThe word is: ${theWord}` : ''),
          )
          .addFields([{ name: 'Turn:', value: (turn + 1).toString() }])
          .setFooter({ text: `Currently Playing: ${msg.author.username}` })
          .setTimestamp();
      }

      return [embed];
    }

    const message = await msg.channel.send({ embeds: getContent() });

    while (gameOver === false && turn <= 5) {
      const collected = await msg.channel.awaitMessages({
        filter: (m) => m.author.id === msg.author.id && m.content.length === theWord.length,
        max: 1,
        time: 300000,
      });

      const word = collected?.first()?.content.toLowerCase();
      if (!word) gameOver = true;
      collected
        ?.first()
        ?.delete()
        .catch(() => {});

      if (!allWords.includes(word)) {
        await error?.delete().catch(() => {});
        error = await msg.channel.send('That word is not in the dictionary!');
        continue;
      }

      if (usedWords.includes(word)) {
        await error?.delete().catch(() => {});
        error = await msg.channel.send('You already used that word!');
        continue;
      } else {
        usedWords.push(word);
      }

      const [results] = dev ? devTestWord(word, theWord) : testWord(word, theWord);

      // Add the results to the game board based on the row
      for (let i = 0; i < results.length; i += 1) {
        if (i === results.length - 1) {
          gameBoard[turn * WIDTH + i] = results[i] + ' | ' + word;
        } else {
          gameBoard[turn * WIDTH + i] = results[i];
        }
      }

      if (word === theWord) {
        gameOver = true;
        winner = true;
      }

      await message.edit({ embeds: getContent() }).catch(() => {
        gameOver = true;
        turn = -2;
      });

      if (!gameOver) {
        turn >= 5 ? (gameOver = true) : (turn += 1);
      }
      await error?.delete().catch(() => {});
    }

    this.client.games.delete(msg.channel.id);
    if (gameOver && turn >= 5) {
      return message.edit({ embeds: getContent() });
    }
    if (gameOver && winner) {
      return message.edit({ embeds: getContent() });
    }
    if (gameOver && turn === -1) {
      return msg.channel.send('There was an error editing the game board, please start a new game.');
    }
    return msg.channel.send('You took too long to guess the word!');
  }
}

module.exports = Wordle;
