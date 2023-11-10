import gulp from "gulp";
import tailwindcss from "tailwindcss";
import postcss from "gulp-postcss";
import htmlmin from "gulp-htmlmin";
import rename from "gulp-rename";
import replace from "gulp-replace";
import path from "path";
import rev from "gulp-rev";
import fs from "fs";
import connect from "gulp-connect";
import fileInclude from "gulp-file-include";
import { deleteSync as delSync } from "del";
import debug from 'gulp-debug';

const paths = {
  src: {
    html: "./src/**/*.html",
    css: "./src/input.css",
    assets: "./assets/**/*",
    fonts: "./assets/fonts/**/*",
    images: "./assets/images/**/*",
  },
  dist: {
    root: "./dist",
    css: "./dist/css",
    assets: "./dist/assets",
  },
};

gulp.task("css", () => {
  return gulp
    .src(paths.src.css)
    .pipe(postcss([tailwindcss()]))
    .pipe(rename("styles.css"))
    .pipe(rev())
    .pipe(gulp.dest(paths.dist.css))
    .pipe(rev.manifest())
    .pipe(gulp.dest(paths.dist.root))
    .pipe(connect.reload()); // Aggiunto per il livereload
});

gulp.task("html", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(paths.dist.root, "rev-manifest.json"), "utf8")
  );
  return gulp
    .src([paths.src.html, "!./src/partials/**"]) // esclude i file nella cartella 'partials'
    .pipe(
      fileInclude({
        // Aggiunta di gulp-file-include
        prefix: "@@",
        basepath: "@file",
      })
    )
    .pipe(
      replace("styles-__REVISION_NUMBER__.css", "css/" + manifest["styles.css"])
    ) // Sostituisci il riferimento al CSS con il numero di revisione
    .pipe(replace("assets/", "assets/"))
    .pipe(gulp.dest(paths.dist.root))
    .pipe(connect.reload()); // Aggiunto per il livereload
});

gulp.task("clean", (done) => {
  delSync(["dist/**", "!dist"]);
  done();
});

gulp.task("copy-fonts", () => {
  return gulp
    .src(paths.src.fonts)
    .pipe(debug({title: 'copy-fonts'}))
    .pipe(gulp.dest(path.join(paths.dist.assets, "fonts")))
    .pipe(connect.reload()); // Aggiunto per il livereload
});

gulp.task("copy-images", () => {
  return gulp
    .src(paths.src.images)
    .pipe(debug({title: 'copy-images'}))
    .pipe(gulp.dest(path.join(paths.dist.assets, "images")))
    .pipe(connect.reload()); // Aggiunto per il livereload
});

gulp.task("connect", () => {
  connect.server({
    root: paths.dist.root,
    livereload: true,
    port: 9010, // Impostato alla porta 9000
  });
});

gulp.task("reload", (done) => {
  gulp.src(paths.dist.root).pipe(connect.reload());
  done();
});

gulp.task(
  "watch",
  gulp.parallel("css", "copy-fonts", "copy-images", "connect", () => {
    gulp.watch(paths.src.css, gulp.series("css", "reload"));
    gulp.watch(paths.src.html, gulp.series("html", "reload"));
    gulp.watch(paths.src.fonts, gulp.series("copy-fonts", "reload"));
    gulp.watch(paths.src.images, gulp.series("copy-images", "reload"));
  })
);

gulp.task(
  "build",
  gulp.series("clean", "css", "copy-fonts", "copy-images", () => {
    const manifest = JSON.parse(
      fs.readFileSync("./dist/rev-manifest.json", "utf8")
    );
    return gulp
      .src(paths.src.html)
      .pipe(replace("styles-__REVISION_NUMBER__.css", manifest["styles.css"])) // Sostituisci il riferimento al CSS con il numero di revisione
      .pipe(replace("assets/", "assets/"))
      .pipe(htmlmin({ collapseWhitespace: true })) // Minimizza solo in fase di build
      .pipe(gulp.dest(paths.dist.root));
  })
);

gulp.task(
  "default",
  gulp.series("clean", "css", "copy-fonts", "copy-images", "html", "watch")
);
