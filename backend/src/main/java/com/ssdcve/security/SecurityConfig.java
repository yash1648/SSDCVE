package com.ssdcve.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http)
            throws Exception {

        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**")
                        .permitAll()
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/verifier/verify"
                        )
                        .permitAll()
                        .requestMatchers("/api/issuer/**")
                        .hasAnyRole("ISSUER", "ADMIN")
                        .requestMatchers("/api/holder/**")
                        .hasAnyRole("HOLDER", "ADMIN")
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/verifier/history"
                        )
                        .authenticated()
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/verifier/verify/**"
                        )
                        .authenticated()
                        .requestMatchers("/api/admin/**")
                        .hasRole("ADMIN")
                        .anyRequest()
                        .authenticated()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(
                                (request, response, authException) -> {
                                    response.setStatus(401);
                                    response.setContentType(
                                            "application/json"
                                    );
                                    response.getWriter().write(
                                            "{\"error\":\"Unauthorized\"}"
                                    );
                                }
                        )
                        .accessDeniedHandler(
                                (request, response, accessDeniedException) -> {
                                    response.setStatus(403);
                                    response.setContentType(
                                            "application/json"
                                    );
                                    response.getWriter().write(
                                            "{\"error\":\"Forbidden\"}"
                                    );
                                }
                        )
                )
                .addFilterBefore(
                        jwtFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}