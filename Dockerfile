FROM node:11.7.0-alpine
LABEL author "Jonathan M. Wilbur <jonathan@wilbur.space>"
RUN mkdir -p /srv/reckless-authorizer
WORKDIR /srv/reckless-authorizer
COPY . /srv/reckless-authorizer/
RUN chmod +x /srv/reckless-authorizer/entrypoint.sh
ENTRYPOINT [ "/srv/reckless-authorizer/entrypoint.sh" ]