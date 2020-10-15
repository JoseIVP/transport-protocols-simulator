# Transport protocols simulator

This is a project under construction. Its main objective is to present graphic
visualizations of *Automatic Repeat Request* protocols like *Stop-and-Wait*,
*Go-Back-N* and *Selective Repeat*.

The project is divided into two main components, the transport protocols library
under `js/src` and the graphic simulator user interface that uses the library.
For now you can find examples of how to use the library in the tests under
`js/tests` in the project repository. Here is also a link for the [documentation
of the library][docs].


## Local development

To develop the project on your machine, you will need [Node.js][node] and npm,
which comes with Node. After clonning the [project repository][repo] you should
open your console and execute:

```bash
cd transport-protocols-simulator # Enter the project files
npm install # Install project dependencies
```

This will install the project dependencies, which are only *development
dependencies*, meaning that the actual source code does not use any external
libraries. The only dependencies are for testing and generating documentation.


## Library testing

We use [Mocha][mocha] for testing the transport protocols library, as the tests
can be run on the browser. **To run the tests you will have to use an HTTP
server**, because we use JavaScript modules and these have some CORS security
requirements. We recommend the [Live Server][live-server] extension for VS Code,
it will execute any changes automatically, but just to make sure, **we also
recommend you to manually reload the page when running tests**.

To run the tests you have to execute the file `mocha.html` on the browser. If
you are using VS Code with Live Server, right click over the file in the editor
and then click over "Open with Live Server".

To make changes to the tests, these are under `js/tests`. If you only want to
run a subset of them, read about [exclusive tests][exclusive-tests] in the
Mocha documentation.


## User interface

We have a mockup of the user interface made with [Figma][figma], here is a link
to [the mockup][mockup].


<!-- References -->

[docs]: https://joseivp.github.io/transport-protocols-simulator/
[node]: https://nodejs.org/en/
[repo]: https://github.com/JoseIVP/transport-protocols-simulator.git
[mocha]: https://mochajs.org
[live-server]: https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer
[exclusive-tests]: https://mochajs.org/#exclusive-tests
[figma]: https://figma.com
[mockup]: https://www.figma.com/file/bfdgXg1r3ytVbija17RgUh/Transport-protocols-simulator?node-id=0%3A1
