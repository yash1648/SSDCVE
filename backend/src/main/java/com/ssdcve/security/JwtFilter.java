package com.ssdcve.security;

import com.ssdcve.model.Role;
import com.ssdcve.service.JwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Reads the access JWT from {@code Authorization: Bearer <token>},
 * validates it, and populates the SecurityContext.
 *
 * Invalid, expired, malformed, or missing tokens leave the request
 * unauthenticated (the chain continues; the entry point returns 401).
 * Refresh tokens are random opaque strings, not JWTs, so they can
 * never parse as access tokens here.
 */
@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String header =
                request.getHeader(HttpHeaders.AUTHORIZATION);

        if (header != null && header.startsWith("Bearer ")) {

            String token = header.substring(7);

            try {

                Claims claims =
                        jwtUtil.parseAccessToken(token);

                UUID userId =
                        jwtUtil.extractUserId(claims);

                Role role =
                        jwtUtil.extractRole(claims);

                List<SimpleGrantedAuthority> authorities =
                        List.of(
                                new SimpleGrantedAuthority(
                                        "ROLE_" + role.name()
                                )
                        );

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userId,
                                null,
                                authorities
                        );

                authentication.setDetails(
                        new WebAuthenticationDetailsSource()
                                .buildDetails(request)
                );

                SecurityContextHolder.getContext()
                        .setAuthentication(authentication);

            } catch (Exception ex) {

                /*
                 * Expired, malformed, wrong signature, or a
                 * refresh token presented as Bearer: do not
                 * authenticate.
                 */
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}