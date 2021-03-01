const Command = require('../../base/Command.js');

class Nickname extends Command {
  constructor (client) {
    super(client, {
      name: 'nickname',
      description: 'Change the nickname of a member',
      usage: 'nickname',
      category: 'Moderator',
      aliases: ['nick'],
      guildOnly: true
    });
  }

  async run (msg, text) {
    const me = msg.guild.me;
    const p = msg.settings.prefix;

    if (!msg.member.permissions.has('MANAGE_NICKNAMES')) return msg.channel.send('You are missing the manage nicknames permission.');
    if (!me.permissions.has('MANAGE_NICKNAMES')) return msg.channel.send('The bot doesn\'t have manage nicknames permission.');

    if (!text[0]) return msg.channel.send(`Incorrect Usage: ${p}Nick <user> (nickname)`);

    const infoMem = msg.mentions.members.first() || msg.guild.members.cache.find(m => m.id === `${text[0]}`) || msg.guild.members.cache.find(m => m.displayName.toUpperCase() === `${text[0].toUpperCase()}`) || msg.guild.members.cache.find(m => m.user.username.toUpperCase() === `${text[0].toUpperCase()}`) || msg.guild.members.cache.find(m => m.user.username.toLowerCase()
      .includes(`${text[0].toLowerCase()}`));

    if (!infoMem) return msg.channel.send('Please supply a proper member.');
    if (infoMem.id === msg.guild.owner.id) return msg.channel.send('Only the server owner of the server can change their nickname.');
    if (infoMem.roles.highest.position > me.roles.highest.position - 1) return msg.channel.send('I need my role higher to change that users nickname.');

    text.shift();
    const nick = text.join(' ');
    if (nick) {
      const oldNick = infoMem.nickname || infoMem.user.username;
      infoMem.setNickname(nick);
      msg.channel.send(`Changed old nickname \`${oldNick}\` to \`${nick}\``);
    } else {
      infoMem.setNickname(infoMem.user.username);
      msg.channel.send(`Reset the nickname of ${infoMem.user.username}`);
    }
  }
}

module.exports = Nickname;
