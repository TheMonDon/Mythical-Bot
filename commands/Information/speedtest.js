/* eslint-disable no-unreachable */
const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const speedTest = require('speedtest-net');

class SpeedTest extends Command {
  constructor (client) {
    super(client, {
      name: 'speedtest',
      description: 'Test the bots internet speed',
      usage: 'speedtest',
      category: 'Information',
      aliases: ['speed']
    });
  }

  async run (msg) { // eslint-disable-line no-unused-vars
    return msg.channel.send('This command doesnt currently work');

    const waiting = await msg.channel.send('This may take awhile, the bot is running the test!');
    try {
      const data = await speedTest();
      const download = data.download.bytes / 0.000001;
      const em = new DiscordJS.MessageEmbed()
        .setTitle('Test the bot\'s internet speed!')
        .setAuthor(msg.member.displayName, msg.member.user.displayAvatarURL())
        .setFooter('Powered by: Speedtest.net')
        .setColor('#0099CC')
        .addField('Download Speed', data.speeds.download.toString() + 'Mbps' || 'N/A', true)
        .addField('Upload Speed', data.speeds.upload.toString() + 'Mbps' || 'N/A', true)
        .addField('Server Location And Distance', data.server.location.toString() + ':(' + data.server.distance.toString() + ')' || 'N/A', false)
        .addField('Ping', data.server.ping.toString() || 'N/A', false)
        .setTimestamp();
      msg.channel.send(em);
      waiting.delete();
    } catch (err) {
      console.log(err);
      msg.channel.send('An error has occured please try again later.');
      waiting.delete();
    }

  }
}

module.exports = SpeedTest;
