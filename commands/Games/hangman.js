const Command = require('../../base/Command.js');
const { getMember } = require('../../base/Util.js');
const randomWords = require('random-words');
const Discord = require('discord.js');

class Hangman extends Command {
  constructor (client) {
    super(client, {
      name: 'hangman',
      description: 'Play a game of hangman.',
      usage: 'hangman',
      category: 'Games'
    });
  }

  async run (msg, args) {
    const current = this.client.games.get(msg.channel.id);
    if (current) return msg.reply(`Please wait until the current game of \`${current.name}\` is finished.`);
    this.client.games.set(msg.channel.id, { name: this.help.name, user: msg.author.id, date: Date.now() });

    const lang = require('../../languages/en-US.json');

    let embedtitlechances;
    let chances = 15;
    const triedLetters = [];
    const hangmanPictures = [
      'https://imgur.com/Ad5vgPD.png',
      'https://imgur.com/jxPXvDP.png',
      'https://imgur.com/M6rbN9m.png',
      'https://imgur.com/KFEHYJG.png',
      'https://imgur.com/fcEsw9A.png',
      'https://imgur.com/S3bBIhl.png',
      'https://imgur.com/gwS4ohM.png',
      'https://imgur.com/RZQCq21.png',
      'https://imgur.com/Py8zHOx.png',
      'https://imgur.com/ikOBjSm.png',
      'https://imgur.com/jSlG4cf.png',
      'https://imgur.com/wsxb7Uq.png',
      'https://imgur.com/bVsUfP3.png',
      'https://imgur.com/Mwzwp6i.png',
      'https://imgur.com/qltUWtL.png',
      'https://imgur.com/vWoekpB.png'
    ];

    const wordToGuess = randomWords(1).toString().toLowerCase();
    const wordToGuessInArray = wordToGuess.split('');

    const newWordString = [];
    for (let i = 0; i < wordToGuess.length; i += 1) {
      newWordString.push('_');
    }

    const mention = getMember(msg, args.join(' '));
    if (mention && !mention.user.bot) {
      const mentionplayquestion = lang.hangman_mentionplayquestion.replace('%mention', mention)
        .replace('%author', msg.author);
      const questionMessage = await msg.channel.send(mentionplayquestion);

      await questionMessage.react('👍');
      await questionMessage.react('👎');

      const collector = questionMessage.createReactionCollector((reaction, user) => user.id === mention.id, {
        time: 120000
      });
      collector.on('collect', async (r) => {
        if (r.emoji.name === '👍') {
          await questionMessage.delete();

          embedtitlechances = lang.hangman_embedtitlechances.replace('%chances', chances);
          const embeddescription = lang.hangman_embeddescription.replace('%word', `\`\`${newWordString.join(' ')}\`\``);
          const firstEmbed = new Discord.MessageEmbed()
            .setColor('BLUE')
            .setTitle(lang.hangman_embedtitlestart)
            .setFooter(embedtitlechances)
            .setImage(hangmanPictures[15 - chances])
            .setDescription(embeddescription);

          const hangmanEmbed = await msg.channel.send({
            embeds: [firstEmbed]
          });

          let message;
          let response;

          let turn = 1;

          for (let i = 0; i < 1000; i += 1) {
            try {
              if (message) {
                await message.delete();
                if (msg.guild.me.permissions.has('MANAGE_MESSAGES')) await response.first().delete();
              }

              if (turn === 1) {
                const letterorwordmessage = lang.hangman_letterorwordmessage.replace('%author', msg.author);
                message = await msg.channel.send(letterorwordmessage);
                response = await msg.channel.awaitMessages((msg2) => msg.author.id === msg2.author.id, {
                  max: 1,
                  time: 180000,
                  errors: ['time']
                });
              } else {
                const letterorwordmessage = lang.hangman_letterorwordmessage.replace('%author', mention);
                message = await msg.channel.send(letterorwordmessage);
                response = await msg.channel.awaitMessages((msg2) => mention.id === msg2.author.id, {
                  max: 1,
                  time: 180000,
                  errors: ['time']
                });
              }

              if (response.first().content.toLowerCase().match(/[a-z]/i)) {
                if (!triedLetters.includes(response.first().content.toLowerCase())) {
                  if (response.first()
                    .content.length === 1) {
                    if (wordToGuessInArray.includes(response.first().content.toLowerCase())) {
                      const embedtitlecorrect = lang.hangman_embedtitlecorrect.replace('%author', turn === 1 ? msg.author.tag : mention.tag)
                        .replace('%letter', response.first().content.toLowerCase());
                      firstEmbed.setTitle(embedtitlecorrect);

                      for (let index2 = 0; index2 < wordToGuess.length; index2++) {
                        if (wordToGuess[index2] === response.first().content.toLowerCase()) {
                          newWordString[index2] = response.first().content.toLowerCase();
                        }
                      }
                      const embeddescriptionwithtried = lang.hangman_embeddescriptionwithtried.replace('%triedletters', triedLetters.join(', '))
                        .replace('%word', `\`\`${newWordString.join(' ')}\`\``);
                      firstEmbed.setDescription(embeddescriptionwithtried);

                      hangmanEmbed.edit({
                        embeds: [firstEmbed]
                      });

                      turn = turn === 1 ? 2 : 1;

                      if (!newWordString.includes('_') && turn === 1) {
                        const mentiongamewon = lang.hangman_mentiongamewon.replace('%author', msg.author)
                          .replace('%word', wordToGuess);
                        return msg.channel.send(mentiongamewon);
                      }
                      if (!newWordString.includes('_') && turn === 2) {
                        const mentiongamewon = lang.hangman_mentiongamewon.replace('%author', mention)
                          .replace('%word', wordToGuess);
                        return msg.channel.send(mentiongamewon);
                      }
                    } else {
                      if (!triedLetters.includes(response.first().content.toLowerCase())) {
                        chances -= 1;
                        triedLetters.push(response.first().content.toLowerCase());
                      }

                      const embedtitlewrong = lang.hangman_embedtitlewrong.replace('%author', turn === 1 ? msg.author.tag : mention.tag)
                        .replace('%letter', response.first().content.toLowerCase());

                      const embeddescriptionwithtried = lang.hangman_embeddescriptionwithtried.replace('%triedletters', triedLetters.join(', '))
                        .replace('%word', `\`\`${newWordString.join(' ')}\`\``);
                      embedtitlechances = lang.hangman_embedtitlechances.replace('%chances', chances);
                      if (chances > 0) {
                        firstEmbed.setTitle(embedtitlewrong);
                        firstEmbed.setFooter(embedtitlechances);
                        firstEmbed.setDescription(embeddescriptionwithtried);
                        firstEmbed.setImage(hangmanPictures[15 - chances]);

                        turn = turn === 1 ? 2 : 1;

                        hangmanEmbed.edit({
                          embeds: [firstEmbed]
                        });
                      } else {
                        firstEmbed.setTitle(embedtitlewrong);
                        firstEmbed.setFooter(embedtitlechances);
                        firstEmbed.setDescription(embeddescriptionwithtried);
                        firstEmbed.setImage(hangmanPictures[15 - chances]);

                        turn === 1 ? turn = 2 : turn = 1;

                        hangmanEmbed.edit({
                          embeds: [firstEmbed]
                        });
                        const mentionnowin = lang.hangman_mentionnowin.replace('%word', wordToGuess);
                        return msg.channel.send(mentionnowin);
                      }
                    }
                  } else {
                    if (wordToGuess.length === response.first().content.length) {
                      if (wordToGuess === response.first().content.toLowerCase()) {
                        const embeddescriptionwithtried = lang.hangman_embeddescriptionwithtried.replace('%triedletters', triedLetters.join(', '))
                          .replace('%word', `\`\`${newWordString.join(' ')}\`\``);

                        const embedtitlecorrect = lang.hangman_embedtitlecorrectword.replace('%author', turn === 1 ? msg.author.tag : mention.tag)
                          .replace('%word', response.first().content.toLowerCase());
                        firstEmbed.setTitle(embedtitlecorrect);
                        firstEmbed.setFooter(embedtitlechances);
                        firstEmbed.setDescription(embeddescriptionwithtried);

                        hangmanEmbed.edit({
                          embeds: [firstEmbed]
                        });

                        if (turn === 1) {
                          turn = 2;
                          const mentiongamewon = lang.hangman_mentiongamewon.replace('%author', msg.author)
                            .replace('%word', response.first().content.toLowerCase());
                          this.client.games.delete(msg.channel.id);
                          return msg.channel.send(mentiongamewon);
                        }
                        turn = 1;
                        const mentiongamewon = lang.hangman_mentiongamewon.replace('%author', mention)
                          .replace('%word', response.first().content.toLowerCase());
                        this.client.games.delete(msg.channel.id);
                        return msg.channel.send(mentiongamewon);
                      }

                      chances -= 1;

                      const embedtitlewrong = lang.hangman_embedtitlewrongword.replace('%author', turn === 1 ? msg.author.tag : mention.tag)
                        .replace('%word', response.first().content.toLowerCase());
                      firstEmbed.setTitle(embedtitlewrong);

                      embedtitlechances = lang.hangman_embedtitlechances.replace('%chances', chances);
                      const embeddescriptionwithtried = lang.hangman_embeddescriptionwithtried.replace('%triedletters', triedLetters.join(', '))
                        .replace('%word', `\`\`${newWordString.join(' ')}\`\``);
                      firstEmbed.setFooter(embedtitlechances);
                      firstEmbed.setDescription(embeddescriptionwithtried);
                      firstEmbed.setImage(hangmanPictures[15 - chances]);

                      turn = turn === 1 ? 2 : 1;

                      hangmanEmbed.edit({
                        embeds: [firstEmbed]
                      });
                    } else {
                      const notwordcharacters = lang.hangman_notwordcharacters.replace('%letterscount', wordToGuess.length);
                      msg.channel.send(notwordcharacters);
                    }
                  }
                } else {
                  msg.channel.send(lang.hangman_guessedletteralready);
                }
              } else {
                msg.channel.send(lang.hangman_noletter);
              }
            } catch (error) {
              const noanswermention = lang.hangman_noanswermention.replace('%author', turn === 1 ? msg.author : mention).replace('%mention', turn === 1 ? mention : msg.author);
              msg.channel.send(noanswermention);
            }
          }
        } else if (r.emoji.name === '👎') {
          if (msg.guild.me.permissions.has('MANAGE_MESSAGES')) await questionMessage.delete();
          this.client.games.delete(msg.channel.id);
          msg.reply(lang.hangman_dontwanttoplay);
        }
      });

      collector.on('end', collected => {
        if (collected.size < 1) this.client.games.delete(msg.channel.id);
      });
    } else {
      embedtitlechances = lang.hangman_embedtitlechances.replace('%chances', chances);
      const embeddescription = lang.hangman_embeddescription.replace('%word', `\`\`${newWordString.join(' ')}\`\``);
      const firstEmbed = new Discord.MessageEmbed()
        .setColor('BLUE')
        .setTitle(lang.hangman_embedtitlestart)
        .setFooter(embedtitlechances)
        .setImage(hangmanPictures[15 - chances])
        .setDescription(embeddescription);

      const hangmanEmbed = await msg.channel.send({
        embeds: [firstEmbed]
      });

      let message;
      let response;

      for (let i = 0; i < 1000; i += 1) {
        try {
          if (message) {
            await message.delete();
            if (msg.guild.me.permissions.has('MANAGE_MESSAGES')) await response.first().delete();
          }
          message = await msg.reply(lang.hangman_letterorwordmessagenomention);
          response = await msg.channel.awaitMessages((msg2) => msg.author.id === msg2.author.id, {
            max: 1,
            time: 180000,
            errors: ['time']
          });

          if (response.first().content.toLowerCase().match(/[a-z]/i)) {
            if (!triedLetters.includes(response.first().content.toLowerCase())) {
              if (response.first().content.length === 1) {
                if (wordToGuessInArray.includes(response.first().content.toLowerCase())) {
                  const embedtitlecorrectnomention = lang.hangman_embedtitlecorrectnomention.replace('%letter', response.first().content.toLowerCase());
                  firstEmbed.setTitle(embedtitlecorrectnomention);

                  for (let index2 = 0; index2 < wordToGuess.length; index2++) {
                    if (wordToGuess[index2] === response.first().content.toLowerCase()) {
                      newWordString[index2] = response.first().content.toLowerCase();
                    }
                  }
                  const embeddescriptionwithtried = lang.hangman_embeddescriptionwithtried.replace('%triedletters', triedLetters.join(', ')).replace('%word', `\`\`${newWordString.join(' ')}\`\``);
                  firstEmbed.setDescription(embeddescriptionwithtried);

                  hangmanEmbed.edit({
                    embeds: [firstEmbed]
                  });

                  const gamewon = lang.hangman_gamewon.replace('%word', wordToGuess);
                  if (!newWordString.includes('_')) return this.client.games.delete(msg.channel.id) && msg.reply(gamewon);
                } else {
                  if (!triedLetters.includes(response.first().content.toLowerCase())) {
                    chances -= 1;
                    triedLetters.push(response.first().content.toLowerCase());
                  }

                  const embeddescriptionwithtried = lang.hangman_embeddescriptionwithtried.replace('%triedletters', triedLetters.join(', ')).replace('%word', `\`\`${newWordString.join(' ')}\`\``);
                  const embedtitlewrongnomention = lang.hangman_embedtitlewrongnomention.replace('%letter', response.first().content.toLowerCase());
                  embedtitlechances = lang.hangman_embedtitlechances.replace('%chances', chances);
                  if (chances > 0) {
                    firstEmbed.setTitle(embedtitlewrongnomention);
                    firstEmbed.setFooter(embedtitlechances);
                    firstEmbed.setDescription(embeddescriptionwithtried);
                    firstEmbed.setImage(hangmanPictures[15 - chances]);

                    hangmanEmbed.edit({
                      embeds: [firstEmbed]
                    });
                  } else {
                    firstEmbed.setTitle(embedtitlewrongnomention);
                    firstEmbed.setFooter(embedtitlechances);
                    firstEmbed.setDescription(embeddescriptionwithtried);
                    firstEmbed.setImage(hangmanPictures[15 - chances]);

                    hangmanEmbed.edit({
                      embeds: [firstEmbed]
                    });
                    const gamelost = lang.hangman_gamelost.replace('%word', wordToGuess);
                    this.client.games.delete(msg.channel.id);
                    return msg.reply(gamelost);
                  }
                }
              } else {
                if (wordToGuess.length === response.first().content.length) {
                  const embeddescriptionwithtried = lang.hangman_embeddescriptionwithtried.replace('%triedletters', triedLetters.join(', '))
                    .replace('%word', `\`\`${newWordString.join(' ')}\`\``);
                  const embedtitlecorrectnomention = lang.hangman_embedtitlecorrectnomentionword.replace('%word', response.first()
                    .content.toLowerCase());
                  embedtitlechances = lang.hangman_embedtitlechances.replace('%chances', chances);
                  if (wordToGuess === response.first().content.toLowerCase()) {
                    firstEmbed.setTitle(embedtitlecorrectnomention);
                    firstEmbed.setFooter(embedtitlechances);
                    firstEmbed.setDescription(embeddescriptionwithtried);

                    hangmanEmbed.edit({
                      embeds: [firstEmbed]
                    });
                    const gamewon = lang.hangman_gamewon.replace('%word', wordToGuess);
                    this.client.games.delete(msg.channel.id);
                    return msg.reply(gamewon);
                  }

                  chances -= 1;
                  embedtitlechances = lang.hangman_embedtitlechances.replace('%chances', chances);
                  const embedtitlewrongnomentionword = lang.hangman_embedtitlewrongnomentionword.replace('%word', response.first()
                    .content.toLowerCase());
                  firstEmbed.setTitle(embedtitlewrongnomentionword);
                  firstEmbed.setFooter(embedtitlechances);
                  firstEmbed.setDescription(embeddescriptionwithtried);
                  firstEmbed.setImage(hangmanPictures[15 - chances]);

                  hangmanEmbed.edit({
                    embeds: [firstEmbed]
                  });
                } else {
                  const notwordcharacters = lang.hangman_notwordcharacters.replace('%letterscount', wordToGuess.length);
                  msg.reply(notwordcharacters);
                }
              }
            } else {
              msg.channel.send(lang.hangman_guessedletteralready);
            }
          } else {
            msg.reply(lang.hangman_noletter);
          }
        } catch (error) {
          const noanswer = lang.hangman_noanswer.replace('%word', wordToGuess);
          this.client.games.delete(msg.channel.id);
          return msg.channel.send(noanswer);
        }
      }
    }
  }
}

module.exports = Hangman;
