const Command = require('../../base/Command.js');
const randomWords = require('random-words');
const { EmbedBuilder } = require('discord.js');

class Hangman extends Command {
  constructor(client) {
    super(client, {
      name: 'hangman',
      description: 'Play a game of hangman.',
      usage: 'hangman',
      category: 'Games',
    });
  }

  async run(msg, args) {
    const current = this.client.games.get(msg.channel.id);
    if (current) return msg.reply(`Please wait until the current game of \`${current.name}\` is finished.`);
    this.client.games.set(msg.channel.id, { name: this.help.name, user: msg.author.id });
    const color = msg.settings.embedColor;

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
      'https://imgur.com/vWoekpB.png',
    ];

    const wordToGuess = randomWords(1).toString().toLowerCase();
    const wordToGuessInArray = wordToGuess.split('');

    const newWordString = [];
    for (let i = 0; i < wordToGuess.length; i += 1) {
      newWordString.push('_');
    }

    const mention = await this.client.util.getMember(msg, args.join(' '));
    if (mention && !mention.user.bot) {
      const questionMessage = await msg.channel.send(`${mention}, do you want to play hangman against ${msg.author}?`);

      await questionMessage.react('👍');
      await questionMessage.react('👎');

      const collector = questionMessage.createReactionCollector((reaction, user) => user.id === mention.id, {
        time: 120000,
      });
      collector.on('collect', async (r) => {
        if (r.emoji.name === '👎') {
          if (msg.guild.members.me.permissions.has('ManageMessages')) await questionMessage.delete();
          this.client.games.delete(msg.channel.id);
          return msg.reply("We are sorry but the mentioned Discord user doesn't want to play hangman against you!");
        } else if (!r || r.length < 1) {
          if (msg.guild.members.me.permissions.has('ManageMessages')) await questionMessage.delete();
          this.client.games.delete(msg.channel.id);
          return msg.reply("We are sorry but the mentioned Discord user doesn't want to play hangman against you!");
        }

        await questionMessage.delete();

        const firstEmbed = new EmbedBuilder()
          .setColor(color)
          .setTitle('Hangman game has been started!')
          .setFooter({ text: `${chances}/15 chances left` })
          .setImage(hangmanPictures[15 - chances])
          .setDescription(`**Word to guess:** \n\`\`${newWordString.join(' ')}\`\``);

        const hangmanEmbed = await msg.channel.send({ embeds: [firstEmbed] });

        let message;
        let response;

        let turn = 1;

        for (let i = 0; i < 1000; i += 1) {
          try {
            if (message) {
              await message.delete();
              if (msg.guild.members.me.permissions.has('ManageMessages')) await response.first().delete();
            }

            if (turn === 1) {
              message = await msg.channel.send(`${msg.author}, please send a letter (A-Z) or guess the word!`);
              response = await msg.channel.awaitMessages({
                filter: (msg2) => msg.author.id === msg2.author.id,
                max: 1,
                time: 180000,
                errors: ['time'],
              });
            } else {
              message = await msg.channel.send(`${msg.author}, please send a letter (A-Z) or guess the word!`);
              response = await msg.channel.awaitMessages({
                filter: (msg2) => mention.id === msg2.author.id,
                max: 1,
                time: 180000,
                errors: ['time'],
              });
            }

            if (response.first().content.toLowerCase().match(/[a-z]/i)) {
              const noLetter = await msg.channel.send('You entered an invalid character!');
              setTimeout(() => {
                noLetter.delete();
              }, 10000);
              msg.channel.send('You entered an invalid character!');
            }

            if (triedLetters.includes(response.first().content.toLowerCase())) {
              const alreadyGuessed = await msg.channel.send('You guessed that letter already!');
              setTimeout(() => {
                alreadyGuessed.delete();
              }, 10000);
            }

            if (response.first().content.length === 1) {
              if (wordToGuessInArray.includes(response.first().content.toLowerCase())) {
                firstEmbed.setTitle(
                  `${turn === 1 ? msg.author.tag : mention.user.tag} guessed the letter "**${response
                    .first()
                    .content.toLowerCase()}**" correctly!`,
                );

                for (let index2 = 0; index2 < wordToGuess.length; index2++) {
                  if (wordToGuess[index2] === response.first().content.toLowerCase()) {
                    newWordString[index2] = response.first().content.toLowerCase();
                  }
                }

                firstEmbed.setDescription(
                  `**Wrong letters used:** ${triedLetters.join(', ')} \n\n**Word to guess:**\n\`\`${newWordString.join(
                    ' ',
                  )}\`\``,
                );

                hangmanEmbed.edit({ embeds: [firstEmbed] });
                turn = turn === 1 ? 2 : 1;

                let gameWonString;
                if (!newWordString.includes('_')) {
                  gameWonString = `%${
                    turn === 1 ? msg.author : mention
                  } won this game! The word to guess was: "**${wordToGuess}**"`;
                }

                await message.delete();
                if (msg.guild.members.me.permissions.has('ManageMessages')) await response.first().delete();
                return msg.channel.send(gameWonString);
              } else {
                if (!triedLetters.includes(response.first().content.toLowerCase())) {
                  chances -= 1;
                  triedLetters.push(response.first().content.toLowerCase());
                }

                if (chances > 0) {
                  firstEmbed
                    .setTitle(
                      `${turn === 1 ? msg.author.tag : mention.user.tag} guessed the letter "**${response
                        .first()
                        .content.toLowerCase()}**" wrong!`,
                    )
                    .setFooter({ text: `${chances}/15 chances left` })
                    .setDescription(
                      `**Wrong letters used:** ${triedLetters.join(
                        ', ',
                      )} \n\n**Word to guess:**\n\`\`${newWordString.join(' ')}\`\``,
                    )
                    .setImage(hangmanPictures[15 - chances]);

                  turn = turn === 1 ? 2 : 1;
                  hangmanEmbed.edit({ embeds: [firstEmbed] });
                } else {
                  firstEmbed
                    .setTitle(
                      `${turn === 1 ? msg.author.tag : mention.user.tag} guessed the letter "**${response
                        .first()
                        .content.toLowerCase()}**" wrong!`,
                    )
                    .setFooter({ text: `${chances}/15 chances left` })
                    .setDescription(
                      `**Wrong letters used:** ${triedLetters.join(
                        ', ',
                      )} \n\n**Word to guess:**\n\`\`${newWordString.join(' ')}\`\``,
                    );
                  firstEmbed.setImage(hangmanPictures[15 - chances]);
                  turn === 1 ? (turn = 2) : (turn = 1);
                  hangmanEmbed.edit({ embeds: [firstEmbed] });

                  await message.delete();
                  if (msg.guild.members.me.permissions.has('ManageMessages')) await response.first().delete();
                  this.client.games.delete(msg.channel.id);
                  return msg.channel.send(`Nobody won! The word to guess was: "**${wordToGuess}**"`);
                }
              }
            } else {
              if (wordToGuess.length !== response.first().content.length) {
                msg.channel.send(`The word must have ${wordToGuess.length} letters!`);
                continue;
              }
              if (wordToGuess === response.first().content.toLowerCase()) {
                firstEmbed
                  .setTitle(
                    `${turn === 1 ? msg.author.tag : mention.user.tag} guessed the word "**${response
                      .first()
                      .content.toLowerCase()}**" correctly!`,
                  )
                  .setFooter({ text: `${chances}/15 chances left` })
                  .setDescription(
                    `**Wrong letters used:** ${triedLetters.join(
                      ', ',
                    )} \n\n**Word to guess:**\n\`\`${newWordString.join(' ')}\`\``,
                  );

                hangmanEmbed.edit({ embeds: [firstEmbed] });

                const gameWonString = `${
                  turn === 1 ? msg.author : mention
                } won this game! The word to guess was: "**${response.first().content.toLowerCase()}**"`;

                this.client.games.delete(msg.channel.id);
                await message.delete();
                if (msg.guild.members.me.permissions.has('ManageMessages')) await response.first().delete();
                return msg.channel.send(gameWonString);
              }

              chances -= 1;

              firstEmbed
                .setTitle(
                  `${turn === 1 ? msg.author.tag : mention.user.tag} guessed the letter "**${response
                    .first()
                    .content.toLowerCase()}**" wrong!`,
                )
                .setFooter({ text: `${chances}/15 chances left` })
                .setDescription(
                  `**Wrong letters used:** ${triedLetters.join(', ')} \n\n**Word to guess:**\n\`\`${newWordString.join(
                    ' ',
                  )}\`\``,
                )
                .setImage(hangmanPictures[15 - chances]);

              turn = turn === 1 ? 2 : 1;

              hangmanEmbed.edit({ embeds: [firstEmbed] });
            }
          } catch (error) {
            msg.channel.send(
              `${
                turn === 1 ? msg.author : mention
              } didn't give an answer! %mention won this game! The word to guess was: "**${
                turn === 1 ? mention : msg.author
              }**"`,
            );
          }
        }
      });

      return collector.on('end', (collected) => {
        if (!collected || collected.size < 1) this.client.games.delete(msg.channel.id);
      });
    }

    // Start normal hangman game!
    const firstEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Hangman game has been started!')
      .setFooter({ text: `${chances}/15 chances left` })
      .setImage(hangmanPictures[15 - chances])
      .setDescription(`**Word to guess:** \n\`\`${newWordString.join(' ')}\`\``);

    const hangmanEmbed = await msg.channel.send({ embeds: [firstEmbed] });

    let message;
    let response;

    for (let i = 0; i < 1000; i += 1) {
      try {
        if (message) {
          await message.delete();
          if (msg.guild.members.me.permissions.has('ManageMessages'))
            await response
              .first()
              .delete()
              .catch(() => {});
        }
        message = await msg.reply('Please send a letter (A-Z) or guess the word!');
        response = await msg.channel
          .awaitMessages({
            filter: (msg2) => msg.author.id === msg2.author.id,
            max: 1,
            time: 180000,
            errors: ['time'],
          })
          .catch(async () => {
            const noAnswer = await msg.channel.send(
              `You didn't give an answer! The word to guess was "**${wordToGuess}**"`,
            );
            this.client.games.delete(msg.channel.id);
            return setTimeout(() => {
              noAnswer.delete();
            }, 10000);
          });

        if (!response.first().content.toLowerCase().match(/[a-z]/i)) {
          if (msg.guild.members.me.permissions.has('ManageMessages')) await response.first().delete();
          const noLetter = await msg.reply('You entered an invalid character!');
          setTimeout(() => {
            noLetter.delete();
          }, 10000);
          continue;
        }

        if (triedLetters.includes(response.first().content.toLowerCase())) {
          if (msg.guild.members.me.permissions.has('ManageMessages')) await response.first().delete();
          const alreadyGuessed = await msg.reply('You guessed that letter already!');
          setTimeout(() => {
            alreadyGuessed.delete();
          }, 10000);
          continue;
        }

        if (response.first().content.length === 1) {
          if (wordToGuessInArray.includes(response.first().content.toLowerCase())) {
            for (let index2 = 0; index2 < wordToGuess.length; index2++) {
              if (wordToGuess[index2] === response.first().content.toLowerCase()) {
                newWordString[index2] = response.first().content.toLowerCase();
              }
            }

            firstEmbed
              .setTitle(`You guessed the letter "**${response.first().content.toLowerCase()}**" correctly! `)
              .setDescription(
                `**Wrong letters used:** ${triedLetters.join(', ')} \n\n**Word to guess:**\n\`\`${newWordString.join(
                  ' ',
                )}\`\``,
              );

            hangmanEmbed.edit({ embeds: [firstEmbed] });

            if (msg.guild.members.me.permissions.has('ManageMessages'))
              await response
                .first()
                .delete()
                .catch(() => {});
            if (!newWordString.includes('_')) {
              await message.delete().catch(() => {});
              if (msg.guild.members.me.permissions.has('ManageMessages'))
                await response
                  .first()
                  .delete()
                  .catch(() => {});
              this.client.games.delete(msg.channel.id);
              return msg.reply(`You won this game! The word to guess was: "**${wordToGuess}**"`);
            }
            continue;
          }

          if (!triedLetters.includes(response.first().content.toLowerCase())) {
            chances -= 1;
            triedLetters.push(response.first().content.toLowerCase());
          }

          if (chances > 0) {
            firstEmbed
              .setTitle(`You guessed the letter "**${response.first().content.toLowerCase()}**" wrong!`)
              .setFooter({ text: `${chances}/15 chances left` })
              .setDescription(
                `**Wrong letters used:** ${triedLetters.join(', ')} \n\n**Word to guess:**\n\`\`${newWordString.join(
                  ' ',
                )}\`\``,
              )
              .setImage(hangmanPictures[15 - chances]);

            hangmanEmbed.edit({ embeds: [firstEmbed] });
            continue;
          } else {
            firstEmbed
              .setTitle(`You guessed the letter "**${response.first().content.toLowerCase()}**" wrong!`)
              .setFooter({ text: `${chances}/15 chances left` })
              .setDescription(
                `**Wrong letters used:** ${triedLetters.join(', ')} \n\n**Word to guess:**\n\`\`${newWordString.join(
                  ' ',
                )}\`\``,
              )
              .setImage(hangmanPictures[15 - chances]);

            hangmanEmbed.edit({ embeds: [firstEmbed] });
            await message.delete().catch(() => {});
            if (msg.guild.members.me.permissions.has('ManageMessages'))
              await response
                .first()
                .delete()
                .catch(() => {});
            this.client.games.delete(msg.channel.id);
            return msg.reply(`You lost this game! The word to guess was: "**${wordToGuess}**"`);
          }
        }

        if (wordToGuess.length === response.first().content.length) {
          if (wordToGuess === response.first().content.toLowerCase()) {
            firstEmbed
              .setTitle(`You guessed the word "**${response.first().content.toLowerCase()}**" correctly! `)
              .setFooter({ text: `${chances}/15 chances left` })
              .setDescription(
                `**Wrong letters used:** ${triedLetters.join(', ')} \n\n**Word to guess:**\n\`\`${newWordString.join(
                  ' ',
                )}\`\``,
              );

            hangmanEmbed.edit({ embeds: [firstEmbed] });
            await message.delete().catch(() => {});
            if (msg.guild.members.me.permissions.has('ManageMessages'))
              await response
                .first()
                .delete()
                .catch(() => {});
            this.client.games.delete(msg.channel.id);
            return msg.reply(`You won this game! The word to guess was: "**${wordToGuess}**"`);
          }

          chances -= 1;
          firstEmbed
            .setTitle(`You guessed the word "**${response.first().content.toLowerCase()}**" wrong!`)
            .setFooter({ text: `${chances}/15 chances left` })
            .setDescription(
              `**Wrong letters used:** ${triedLetters.join(', ')} \n\n**Word to guess:**\n\`\`${newWordString.join(
                ' ',
              )}\`\``,
            )
            .setImage(hangmanPictures[15 - chances]);

          hangmanEmbed.edit({ embeds: [firstEmbed] });
          if (msg.guild.members.me.permissions.has('ManageMessages'))
            await response
              .first()
              .delete()
              .catch(() => {});
          continue;
        } else {
          if (msg.guild.members.me.permissions.has('ManageMessages'))
            await response
              .first()
              .delete()
              .catch(() => {});
          msg.reply(`The word must have ${wordToGuess.length} letters!`);
          continue;
        }
      } catch (error) {
        console.log(error);
        await msg.reply(`You didn't give an answer! The word to guess was "**${wordToGuess}**"`);
        return this.client.games.delete(msg.channel.id);
      }
    }
  }
}

module.exports = Hangman;
