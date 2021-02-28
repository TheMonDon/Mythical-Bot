const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const DiscordJS = require('discord.js');

class rps extends Command {
  constructor(client) {
    super(client, {
      name: 'rps',
      description: 'Play a game of rock paper scissors.',
      usage: 'rps',
      category: 'Fun',
    });
  }

  async run(msg, text) {
    const p = msg.settings.prefix;
    const server = msg.guild;
    let mem;

    if (!text || text.length < 1) {
      return msg.channel.send(`Incorrect Usage: ${p}rps <user>`);
    } else {
      mem = msg.mentions.members.first() || server.members.cache.find(m => m.id === `${text.join(' ')}`) || server.members.cache.find(m => m.displayName.toUpperCase() === `${text.join(' ').toUpperCase()}`) || server.members.cache.find(m => m.user.username.toUpperCase() === `${text.join(' ').toUpperCase()}`) || server.members.cache.find(m => m.user.username.toLowerCase()
        .includes(`${text.join(' ').toLowerCase()}`));
    }
    const p1 = msg.author;
    const chan = msg.channel;
    let auth_reply;
    let mem_reply;

    if (!mem) return msg.channel.send(`Incorrect Usage: ${p}rps <user> (Please enter a valid user)`);
    if (mem.user.id === msg.author.id) return msg.channel.send('You can\'t play against yourself, silly.');
    if (mem.user.bot) return msg.channel.send('You can\'t play rock paper scissors with someone who has no hands, now can you?');

    const reply = await msg.channel.send(`Alright, get ready ${msg.member} and ${mem}! ${msg.member.displayName} is up first. I'll send you both a DM.`);
    await msg.author.send(stripIndents`
      Please type your response below.

      - Rock
      - Paper
      - Scissors

      You have 1 minute!
    `)
      .then(async (msg) => {
        setTimeout(function () { }, 1000);
        await msg.channel.awaitMessages(msg => msg.content.match(/^rock|paper|scissors$/i) && msg.author.id === p1.id, {
          max: 1,
          time: 60000,
          errors: ['time'],
        })
          .then((collected) => {
            auth_reply = collected.first()
              .content.toLowerCase();
            msg.channel.send(`Your response of \`${collected.first().content.toLowerCase()}\` has been saved.`);
          })
          .catch(() => {
            msg.channel.send('Error: You did not reply in time.');
            mem.send(`${p1} did not reply in time, so they forfitted the game.`);
            reply.delete();
            return chan.send('The game starter did not reply in time, so the game was forfitted.');
          });
      });
    await mem.send(stripIndents`
      Please type your response below.
    
      - Rock
      - Paper
      - Scissors
    
      You have 1 minute!
    `)
      .then(async (msg) => {
        setTimeout(function () { }, 1000);
        await msg.channel.awaitMessages(msg => msg.content.match(/^rock|paper|scissors$/i) && msg.author.id === mem.id, {
          max: 1,
          time: 60000,
          errors: ['time'],
        })
          .then((collected) => {
            mem_reply = collected.first()
              .content.toLowerCase();
            msg.channel.send(`Your response of \`${collected.first().content.toLowerCase()}\` has been saved. \nCheck ${chan} for the results!`);
            p1.send(`${mem} has replied, check ${chan} for the results.`);
          })
          .catch(() => {
            msg.channel.send('Error: You did not reply in time.');
            p1.send(`${mem} did not reply in time, so they forfitted the game.`);
            reply.delete();
            return chan.send(`${mem.displayName} did not reply in time, so the game was forfitted.`);
          });
      });

    const embed = new DiscordJS.MessageEmbed();
    embed.setTitle('Rock - Paper - Scissors');
    embed.setColor('RANDOM');

    if (auth_reply === mem_reply) {
      embed.setDescription(stripIndents`
        No winner this time!
        ${mem} and ${p1} both chose the same thing.
        
        The tied item was: ${auth_reply}
        `);
    } else if (auth_reply === 'rock') {
      if (mem_reply === 'scissors') {
        embed.setDescription(stripIndents`
            The winner was: ${p1}!
            The winning item was: ${auth_reply}
            `);
      } else {
        embed.setDescription(stripIndents`
            The winner was: ${mem}!
            The winning item was: ${mem_reply}
            `);
      }
    } else if (auth_reply === 'paper') {
      if (mem_reply === 'rock') {
        embed.setDescription(stripIndents`
            The winner was: ${p1}!
            The winning item was: ${auth_reply}
            `);
      } else {
        if (mem_reply === 'scissors') {
          embed.setDescription(stripIndents`
                The winner was: ${mem}!
                The winning item was: ${mem_reply}
                `);
        }
      }
    } else if (auth_reply === 'scissors') {
      if (mem_reply === 'rock') {
        embed.setDescription(stripIndents`
            The winner was: ${mem}!
            The winning item was: ${mem_reply}
            `);
      } else {
        if (mem_reply === 'paper') {
          embed.setDescription(stripIndents`
                The winner was: ${p1}!
                The winning item was: ${auth_reply}
                `);
        }
      }
    }
    reply.delete();
    chan.send(embed);
  }
}

module.exports = rps;
