/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
const Command = require('../../base/Command.js');
const randomWords = require('random-words');
const { EmbedBuilder } = require('discord.js');
const { readFileSync } = require('fs');
const path = require('path');

class Wordle extends Command {
  constructor (client) {
    super(client, {
      name: 'wordle',
      description: 'Play the famous wordle game!',
      usage: 'wordle',
      category: 'Fun'
    });
  }

  async run (msg, args, level) {
    let dev = false;
    const current = this.client.games.get(msg.channel.id);
    if (current) return msg.reply(`Please wait until the current game of \`${current.name}\` is finished.`);
    this.client.games.set(msg.channel.id, { name: this.help.name, user: msg.author.id, date: Date.now() });

    // Allow the owner to use the dev test function
    if (args?.length > 0) {
      if (args[0] === 'dev') {
        if (level < 2) return msg.reply('You do not have permission to use this command.');
        dev = true;
      }
    }

    let gameOver = false;
    let winner = false;
    let turn = 0;
    let message;
    let error;
    const WIDTH = 5;
    const HEIGHT = 6;
    const gameBoard = [];
    const allWords = readFileSync(path.join(__dirname, '/../../resources/sgb-words.txt'), 'utf8');

    let theWord = randomWords({ exactly: 1, minLength: 5, maxLength: 5 }).toString();
    while (theWord.length < 5) {
      theWord = randomWords({ exactly: 1, minLength: 5, maxLength: 5 }).toString();
    }

    // Take the guess and the answer and return an array of results (🟩, 🟨, ⬜)
    function testWord (guess, answer) {
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
    };

    // Updated function to check for duplicate letters
    function devTestWord (guess, answer) {
      const results = [];
      for (let i = 0; i < guess.length; i += 1) {
        const char = guess[i];
        if (char === answer[i]) {
          results.push('🟩');
        } else if (answer.includes(char)) {
          if (guess.includes(char)) {
            results.push('⬜');
          } else {
            results.push('🟨');
          }
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
    function gameBoardToString () {
      let str = '';
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          str += gameBoard[y * WIDTH + x];
        }
        str += '\n';
      }
      return str;
    }

    // Return the embed content
    function getContent () {
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
          .setDescription(`${gameBoardToString()} \nGuess the word! (5 letters)`)
          .addFields([{ name: 'Turn:', value: (turn + 1).toString() }])
          .setFooter({ text: `Currently Playing: ${msg.author.username}` })
          .setTimestamp();
      }

      return [embed];
    }

    message = await msg.channel.send({ embeds: getContent() });

    while (gameOver === false && turn <= 5) {
      const collected = await msg.channel.awaitMessages({
        filter: m => m.author.id === msg.author.id && m.content.length === 5,
        max: 1,
        time: 300000
      });

      if (!collected?.first()?.content) gameOver = true;
      const word = collected.first().content.toLowerCase();
      collected.first().delete().catch(() => {});

      if (!allWords.includes(word)) {
        error = await msg.channel.send('That word is not in the dictionary!');
        continue;
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

      await message.edit({ embeds: getContent() });
      turn >= 5 ? gameOver = true : turn += 1;
      await error?.delete().catch(() => {});
    }

    this.client.games.delete(msg.channel.id);
    if (gameOver && turn >= 5) {
      return message.edit({ embeds: getContent() });
    }
    if (gameOver && winner) {
      return message.edit({ embeds: getContent() });
    }
    return msg.channel.send('You took too long to guess the word!');
  }
}

module.exports = Wordle;
